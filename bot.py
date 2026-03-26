import random
import os
import uuid
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, CallbackQueryHandler,
    MessageHandler, filters, ContextTypes
)

# ENV
def get_env_int(name):
    value = os.getenv(name)
    if value is None:
        raise ValueError(f"{name} not set")
    return int(value)

TOKEN = os.getenv("BOT_TOKEN")
MY_ID = get_env_int("MY_ID")
PARTNER_ID = get_env_int("PARTNER_ID")

tasks = {}
user_state = {}
seen_users = set()

game_state = {"started": False}

# No repeat logic
used_truths = set()
used_dares = set()

def get_unique(items, used_set):
    if len(used_set) == len(items):
        used_set.clear()
    remaining = list(set(items) - used_set)
    choice = random.choice(remaining)
    used_set.add(choice)
    return choice

# QUESTIONS
truths = [
    "When did you first start liking me? 👀",
    "What do you like most about me?",
    "Have you ever been jealous because of me?",
    "What’s your biggest secret?",
    "What’s your favorite memory with me?"
]

dares = [
    "Send me your cutest selfie 😏",
    "Call me for 1 minute",
    "Send a voice note saying something sweet",
    "Describe me in 3 words",
    "Send a random emoji that describes me"
]

# UI
def spin_keyboard():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("🎰 Spin", callback_data="spin")]
    ])

def play_again_keyboard():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("🔁 Play Again", callback_data="play_again")]
    ])

def main_keyboard():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("Random Truth 😇", callback_data="truth"),
         InlineKeyboardButton("Random Dare 😈", callback_data="dare")],
        [InlineKeyboardButton("Manual ✍️", callback_data="manual")]
    ])

# START
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.message.from_user.id

    if user_id not in seen_users:
        seen_users.add(user_id)

        tutorial = (
            "💖 Truth & Dare 💖\n\n"
            "🎰 Spin to start\n"
            "😇 Truth → Answer\n"
            "😈 Dare → Complete\n\n"
            "Keep it fun 😏🔥\n\n"
            "✨ Created by Mohit"
        )

        await update.message.reply_text(tutorial, reply_markup=spin_keyboard())
    else:
        if not game_state["started"]:
            await update.message.reply_text("Start with spin 🎰", reply_markup=spin_keyboard())
        else:
            await update.message.reply_text("Continue 😏", reply_markup=main_keyboard())

# BUTTON
async def button(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    user_id = query.from_user.id

    if user_id == MY_ID:
        sender = MY_ID
        receiver = PARTNER_ID
        name = "Mohit"
    elif user_id == PARTNER_ID:
        sender = PARTNER_ID
        receiver = MY_ID
        name = "Your Partner"
    else:
        await query.edit_message_text("Unauthorized 😑")
        return

    # SPIN
    if query.data == "spin":
        if game_state["started"]:
            await query.answer("Already decided 😑", show_alert=True)
            return

        game_state["started"] = True
        msg = "🎰 You go first 😏" if random.choice([True, False]) else "🎰 Partner goes first 👀"

        await query.edit_message_text(msg, reply_markup=main_keyboard())

    # PLAY AGAIN
    elif query.data == "play_again":
        await query.edit_message_text("Choose 😏", reply_markup=main_keyboard())

    # RANDOM
    elif query.data == "truth":
        q = get_unique(truths, used_truths)
        await send_task(context, sender, receiver, q, f"😇 Truth from {name} 💌", "truth")

    elif query.data == "dare":
        q = get_unique(dares, used_dares)
        await send_task(context, sender, receiver, q, f"😈 Dare from {name} 💌", "dare")

    # MANUAL
    elif query.data == "manual":
        keyboard = [
            [InlineKeyboardButton("Truth 😇", callback_data="manual_truth"),
             InlineKeyboardButton("Dare 😈", callback_data="manual_dare")]
        ]
        await query.edit_message_text("Choose 👀", reply_markup=InlineKeyboardMarkup(keyboard))

    elif query.data == "manual_truth":
        user_state[user_id] = "waiting_truth"
        await query.edit_message_text("Type your Truth 😏")

    elif query.data == "manual_dare":
        user_state[user_id] = "waiting_dare"
        await query.edit_message_text("Type your Dare 😈")

    # ANSWER
    elif query.data.startswith("answer_"):
        task_id = query.data.split("_")[1]
        user_state[user_id] = f"answering_{task_id}"
        await query.edit_message_text("Type your answer 💬")

    # DONE / SKIP
    elif query.data.startswith("done_") or query.data.startswith("skip_"):
        action, task_id = query.data.split("_")
        sender = tasks.get(task_id)

        if not sender:
            await query.edit_message_text("Expired 😶", reply_markup=play_again_keyboard())
            return

        if action == "done":
            await query.edit_message_text("Done 😌", reply_markup=play_again_keyboard())
            await context.bot.send_message(sender, "Completed 😏🔥")

        elif action == "skip":
            await query.edit_message_text("Skipped 😅", reply_markup=play_again_keyboard())
            await context.bot.send_message(sender, "Skipped 😬")

        del tasks[task_id]

# SEND TASK
async def send_task(context, sender, receiver, text, label, task_type):
    task_id = str(uuid.uuid4())
    tasks[task_id] = sender

    if task_type == "truth":
        keyboard = [
            [
                InlineKeyboardButton("✍️ Answer", callback_data=f"answer_{task_id}"),
                InlineKeyboardButton("❌ Skip", callback_data=f"skip_{task_id}")
            ]
        ]
    else:
        keyboard = [
            [
                InlineKeyboardButton("✅ Done", callback_data=f"done_{task_id}"),
                InlineKeyboardButton("❌ Skip", callback_data=f"skip_{task_id}")
            ]
        ]

    await context.bot.send_message(
        chat_id=receiver,
        text=f"{label}\n\n{text}",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

# MESSAGE
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.message.from_user.id
    text = update.message.text

    if user_id == MY_ID:
        sender = MY_ID
        receiver = PARTNER_ID
    elif user_id == PARTNER_ID:
        sender = PARTNER_ID
        receiver = MY_ID
    else:
        return

    if user_state.get(user_id) == "waiting_truth":
        await send_task(context, sender, receiver, text, "😇 Truth 💌", "truth")
        user_state[user_id] = None

    elif user_state.get(user_id) == "waiting_dare":
        await send_task(context, sender, receiver, text, "😈 Dare 💌", "dare")
        user_state[user_id] = None

    elif user_state.get(user_id, "").startswith("answering_"):
        task_id = user_state[user_id].split("_")[1]
        sender = tasks.get(task_id)

        if sender:
            await context.bot.send_message(sender, f"💬 Answer:\n\n{text}")

        user_state[user_id] = None
        await context.bot.send_message(user_id, "Sent 😏", reply_markup=play_again_keyboard())

# MAIN
def main():
    app = Application.builder().token(TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CallbackQueryHandler(button))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    print("Bot running...")
    app.run_polling()

if __name__ == "__main__":
    main()
