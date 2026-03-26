import random
import os
import uuid
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, CallbackQueryHandler,
    MessageHandler, filters, ContextTypes
)

# ENV VARIABLES
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

# START
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.message.from_user.id

    keyboard = [
        [InlineKeyboardButton("Truth 😇", callback_data="truth"),
         InlineKeyboardButton("Dare 😈", callback_data="dare")],
        [InlineKeyboardButton("Manual ✍️", callback_data="manual")]
    ]

    if user_id not in seen_users:
        seen_users.add(user_id)

        tutorial = (
            "💖 Welcome to Truth & Dare 💖\n\n"
            "📌 How to play:\n"
            "• Truth 😇 → Answer or Skip\n"
            "• Dare 😈 → Do or Skip\n"
            "• Manual ✍️ → Send your own\n\n"
            "💬 Click Answer → then type reply\n\n"
            "Now go have fun 😏🔥\n\n"
            "✨ Created by Mohit"
        )

        await update.message.reply_text(
            tutorial,
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    else:
        await update.message.reply_text(
            "💖 Truth & Dare Game 💖\n\nPlay smart 😏\n\n✨ Created by Mohit",
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

# BUTTON HANDLER
async def button(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    user_id = query.from_user.id

    # Identify users
    if user_id == MY_ID:
        sender = MY_ID
        receiver = PARTNER_ID
    elif user_id == PARTNER_ID:
        sender = PARTNER_ID
        receiver = MY_ID
    else:
        await query.edit_message_text("Unauthorized 😑")
        return

    # RANDOM
    if query.data == "truth":
        q = random.choice(truths)
        await send_task(context, sender, receiver, q, "😇 Truth", "truth")

    elif query.data == "dare":
        q = random.choice(dares)
        await send_task(context, sender, receiver, q, "😈 Dare", "dare")

    # MANUAL
    elif query.data == "manual":
        keyboard = [
            [InlineKeyboardButton("Manual Truth 😇", callback_data="manual_truth"),
             InlineKeyboardButton("Manual Dare 😈", callback_data="manual_dare")]
        ]
        await query.edit_message_text("Choose 👀", reply_markup=InlineKeyboardMarkup(keyboard))

    elif query.data == "manual_truth":
        user_state[user_id] = "waiting_truth"
        await query.edit_message_text("Type your Truth 😏")

    elif query.data == "manual_dare":
        user_state[user_id] = "waiting_dare"
        await query.edit_message_text("Type your Dare 😈")

    # ANSWER BUTTON
    elif query.data.startswith("answer_"):
        task_id = query.data.split("_")[1]
        user_state[user_id] = f"answering_{task_id}"
        await query.edit_message_text("Type your answer 💬")

    # DONE / SKIP
    elif query.data.startswith("done_") or query.data.startswith("skip_"):
        action, task_id = query.data.split("_")
        sender = tasks.get(task_id)

        if not sender:
            await query.edit_message_text("Expired 😶")
            return

        if action == "done":
            await query.edit_message_text("Done 😌")
            await context.bot.send_message(sender, "Task completed 😏🔥")

        elif action == "skip":
            await query.edit_message_text("Skipped 😅")
            await context.bot.send_message(sender, "Task skipped 😬")

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
        text=f"{label}\n\n{text}\n\n✨ Created by Mohit",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

# MESSAGE HANDLER
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

    # Manual Truth
    if user_state.get(user_id) == "waiting_truth":
        await send_task(context, sender, receiver, text, "😇 Truth", "truth")
        user_state[user_id] = None

    # Manual Dare
    elif user_state.get(user_id) == "waiting_dare":
        await send_task(context, sender, receiver, text, "😈 Dare", "dare")
        user_state[user_id] = None

    # Answer system
    elif user_state.get(user_id, "").startswith("answering_"):
        task_id = user_state[user_id].split("_")[1]
        sender = tasks.get(task_id)

        if sender:
            await context.bot.send_message(
                chat_id=sender,
                text=f"💬 Answer:\n\n{text}"
            )

        user_state[user_id] = None

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
