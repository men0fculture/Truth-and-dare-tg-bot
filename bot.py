import json
import os
import random
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

# Enable logging
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                    level=logging.INFO)
logger = logging.getLogger(__name__)

# ---- Data persistence ----
DATA_FILE = "data.json"

def load_data():
    """Load truths and dares from JSON file."""
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    else:
        # Default data
        default_data = {
            "truths": [
                "What is your biggest fear?",
                "What's the most embarrassing thing you've ever done?",
                "Have you ever lied to me?",
                "What's a secret you've never told anyone?",
                "Who is your celebrity crush?"
            ],
            "dares": [
                "Send me your funniest selfie.",
                "Do 10 jumping jacks right now.",
                "Say a tongue twister three times fast.",
                "Tell me something you love about me.",
                "Sing the chorus of your favorite song."
            ]
        }
        save_data(default_data)
        return default_data

def save_data(data):
    """Save truths and dares to JSON file."""
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

# Global data store
data = load_data()

# ---- Command handlers ----
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send a welcome message when /start is issued."""
    user = update.effective_user
    await update.message.reply_text(
        f"Hi {user.first_name}! 😊\n\n"
        "I'm your Truth or Dare bot.\n\n"
        "**Random commands:**\n"
        "/truth – random truth from the list\n"
        "/dare – random dare from the list\n\n"
        "**Manual commands (type your own):**\n"
        "/truth_manual <your question>\n"
        "/dare_manual <your dare>\n\n"
        "**Admin commands (add to the list):**\n"
        "/add_truth <question>\n"
        "/add_dare <dare>\n\n"
        "Let's have fun!"
    )

async def truth(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send a random truth question."""
    if not data["truths"]:
        await update.message.reply_text("No truth questions available! Add some with /add_truth.")
        return
    question = random.choice(data["truths"])
    await update.message.reply_text(f"🎲 Truth: {question}")

async def dare(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send a random dare."""
    if not data["dares"]:
        await update.message.reply_text("No dares available! Add some with /add_dare.")
        return
    dare_cmd = random.choice(data["dares"])
    await update.message.reply_text(f"🎲 Dare: {dare_cmd}")

# ---- Manual commands (anyone can use) ----
async def truth_manual(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send a custom truth question typed by the user."""
    question = ' '.join(context.args)
    if not question:
        await update.message.reply_text("Usage: /truth_manual <your question>")
        return
    await update.message.reply_text(f"🎲 Truth: {question}")

async def dare_manual(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send a custom dare typed by the user."""
    dare_text = ' '.join(context.args)
    if not dare_text:
        await update.message.reply_text("Usage: /dare_manual <your dare>")
        return
    await update.message.reply_text(f"🎲 Dare: {dare_text}")

# ---- Admin commands (restricted to you) ----
# Replace YOUR_USER_ID with your actual Telegram user ID
# You can get it from @userinfobot on Telegram
ADMIN_USER_ID = 123456789  # CHANGE THIS TO YOUR ID

async def add_truth(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Add a new truth question (admin only)."""
    user_id = update.effective_user.id
    if user_id != ADMIN_USER_ID:
        await update.message.reply_text("Sorry, only the bot owner can add questions.")
        return

    question = ' '.join(context.args)
    if not question:
        await update.message.reply_text("Usage: /add_truth <your question>")
        return

    data["truths"].append(question)
    save_data(data)
    await update.message.reply_text(f"✅ Added truth: {question}")

async def add_dare(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Add a new dare (admin only)."""
    user_id = update.effective_user.id
    if user_id != ADMIN_USER_ID:
        await update.message.reply_text("Sorry, only the bot owner can add dares.")
        return

    dare_text = ' '.join(context.args)
    if not dare_text:
        await update.message.reply_text("Usage: /add_dare <your dare>")
        return

    data["dares"].append(dare_text)
    save_data(data)
    await update.message.reply_text(f"✅ Added dare: {dare_text}")

# ---- Main function ----
def main():
    # Replace 'YOUR_TOKEN' with your bot's token
    application = Application.builder().token("YOUR_TOKEN").build()

    # Register commands
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("truth", truth))
    application.add_handler(CommandHandler("dare", dare))
    application.add_handler(CommandHandler("truth_manual", truth_manual))
    application.add_handler(CommandHandler("dare_manual", dare_manual))
    application.add_handler(CommandHandler("add_truth", add_truth))
    application.add_handler(CommandHandler("add_dare", add_dare))

    # Start the bot
    print("Bot is running...")
    application.run_polling()

if __name__ == "__main__":
    main()
