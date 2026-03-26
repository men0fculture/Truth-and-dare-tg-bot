import random
import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, CallbackQueryHandler,
    MessageHandler, filters, ContextTypes
)

TOKEN = os.getenv("BOT_TOKEN")

user_mode = {}
used_questions = {}

truths = [
    "When did you first start liking me? 👀",
    "What’s one thing you’ve imagined about us but never said?",
    "What do you like most about my personality?",
    "Have you ever been jealous because of me?",
    "What’s your biggest insecurity?",
    "What’s something you secretly wish I would do?",
    "What’s your ideal date with me?",
    "What do you notice first about me?",
    "Have you ever stalked my profile? How much? 😏",
    "What’s something about me that surprised you?",
    "What’s one thing you want from me right now?",
    "What do you think about before sleeping?",
    "What’s your biggest turn-on?",
    "What’s your biggest turn-off?",
    "What’s your guilty pleasure?",
    "What’s one thing you’d never admit normally?",
    "What’s your favorite memory with me?",
    "What do you think I feel about you?",
    "What scares you in relationships?",
    "What’s something you wish I understood better?",
    "What’s your love language?",
    "What would you do if I ignored you for a day?",
    "What’s one thing you want to ask me but hesitate?",
    "What’s your first impression of me?",
    "What’s something you regret not saying to me?",
    "What do you think makes me different?",
    "What’s something you find hard to tell me?",
    "What’s one thing that always makes you smile?",
    "What do you think about us long-term?",
    "What’s one secret you haven’t told anyone?"
]

dares = [
    "Send me your cutest selfie right now 😏",
    "Send a voice note saying something sweet",
    "Describe me in 3 words",
    "Call me for 1 minute (no excuses 😌)",
    "Send the last photo in your gallery",
    "Text me something you’ve never said before",
    "Write a flirty one-liner for me",
    "Send a random emoji that describes me",
    "Pretend you’re proposing to me 💍",
    "Send a voice note saying my name differently",
    "Send a meme that reminds you of me",
    "Say something bold about me",
    "Send your most recent selfie without filters",
    "Tell me your mood using only emojis",
    "Send a screenshot of your last chat (no cheating 😏)",
    "Send a song that reminds you of me",
    "Say something you’ve been holding back",
    "Give me a nickname right now",
    "Send a 5-second voice note laughing",
    "Type the first thing that comes to your mind about me",
    "Send your current outfit pic",
    "Say something dramatic about us",
    "Send a random confession",
    "Act like you’re angry at me for 10 seconds",
    "Send your favorite selfie",
    "Describe your current mood in one sentence",
    "Send a random GIF that matches me",
    "Tell me a secret in 5 seconds",
    "Say something that would make me blush",
    "Send a picture of something near you"
]

def get_random_question(user_id, q_list):
    if user_id not in used_questions:
        used_questions[user_id] = []

    remaining = list(set(q_list) - set(used_questions[user_id]))

    if not remaining:
        used_questions[user_id] = []
        remaining = q_list

    q = random.choice(remaining)
    used_questions[user_id].append(q)
    return q

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [InlineKeyboardButton("Random Mode 🎲", callback_data="random_mode")],
        [InlineKeyboardButton("Manual Mode ✍️", callback_data="manual_mode")]
    ]
    await update.message.reply_text(
        "Choose your mode 😏",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def show_choice(query):
    keyboard = [
        [
            InlineKeyboardButton("Truth 😇", callback_data="truth"),
            InlineKeyboardButton("Dare 😈", callback_data="dare")
        ]
    ]
    await query.edit_message_text("Pick one 👀", reply_markup=InlineKeyboardMarkup(keyboard))

async def button(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    user_id = query.from_user.id

    if query.data == "random_mode":
        user_mode[user_id] = "random"
        await show_choice(query)

    elif query.data == "manual_mode":
        user_mode[user_id] = "manual"
        await query.edit_message_text("Send your own Truth or Dare 😌")

    elif query.data == "truth":
        question = get_random_question(user_id, truths)
        await send_question(query, question)

    elif query.data == "dare":
        question = get_random_question(user_id, dares)
        await send_question(query, question)

    elif query.data == "start_game":
        await show_choice(query)

async def send_question(query, question):
    keyboard = [
        [InlineKeyboardButton("Next 🔁", callback_data="start_game")]
    ]
    await query.edit_message_text(question, reply_markup=InlineKeyboardMarkup(keyboard))

async def manual_input(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.message.from_user.id

    if user_mode.get(user_id) == "manual":
        text = update.message.text
        await update.message.reply_text(
            f"Nice one 😏\n\n{text}",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("Next 🔁", callback_data="start_game")]
            ])
        )

def main():
    app = Application.builder().token(TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CallbackQueryHandler(button))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, manual_input))

    print("Bot running...")
    app.run_polling()

if __name__ == "__main__":
    main()
