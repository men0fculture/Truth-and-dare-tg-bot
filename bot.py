import random
import os
import uuid
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, CallbackQueryHandler,
    ContextTypes
)

TOKEN = os.getenv("BOT_TOKEN")
MY_ID = int(os.getenv("MY_ID"))
PARTNER_ID = int(os.getenv("PARTNER_ID"))

tasks = {}

truths = [
    "When did you first start liking me? 👀",
    "What do you like most about me?",
    "Have you ever been jealous because of me?",
    "What’s your biggest secret?",
    "What’s your favorite memory with me?",
    "What’s one thing you’ve never told me?",
    "What do you think about before sleeping?",
    "What’s your biggest turn-on?",
    "What’s your biggest turn-off?",
    "What’s your first impression of me?"
]

dares = [
    "Send me your cutest selfie 😏",
    "Call me for 1 minute",
    "Send a voice note saying something sweet",
    "Describe me in 3 words",
    "Send a random emoji that describes me",
    "Send your last gallery photo",
    "Say something bold about me",
    "Send a meme that reminds you of me",
    "Give me a nickname",
    "Send a flirty line"
]

# START
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [InlineKeyboardButton("Truth 😇", callback_data="truth"),
         InlineKeyboardButton("Dare 😈", callback_data="dare")]
    ]

    await update.message.reply_text(
        "💖 Truth & Dare Game 💖\n\n"
        "Just tap and play 😏\n\n"
        "✨ Created by Mohit",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

# BUTTON
async def button(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    user_id = query.from_user.id

    # decide receiver smartly
    if user_id == MY_ID:
        receiver = PARTNER_ID
        sender = MY_ID
    elif user_id == PARTNER_ID:
        receiver = MY_ID
        sender = PARTNER_ID
    else:
        await query.edit_message_text("Unauthorized user 😑")
        return

    if query.data == "truth":
        q = random.choice(truths)
        await send_task(context, sender, receiver, q, "😇 Truth")

    elif query.data == "dare":
        q = random.choice(dares)
        await send_task(context, sender, receiver, q, "😈 Dare")

# SEND TASK
async def send_task(context, sender, receiver, text, label):
    task_id = str(uuid.uuid4())
    tasks[task_id] = sender

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

# RESPONSE
async def response(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    action, task_id = query.data.split("_")
    sender = tasks.get(task_id)

    if not sender:
        await query.edit_message_text("Expired 😶")
        return

    if action == "done":
        await query.edit_message_text("Done 😌")
        await context.bot.send_message(sender, "Completed 😏🔥")

    elif action == "skip":
        await query.edit_message_text("Skipped 😅")
        await context.bot.send_message(sender, "Skipped 😬")

    del tasks[task_id]

# MAIN
def main():
    app = Application.builder().token(TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CallbackQueryHandler(response, pattern="^(done_|skip_)"))
    app.add_handler(CallbackQueryHandler(button))

    print("Bot running...")
    app.run_polling()

if __name__ == "__main__":
    main()
