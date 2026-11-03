/**
 * Sigmazam Telegram Preview Dispatcher
 * Automatically detects admin chat_id from /start and sends preview packs.
 */

export async function detectChatIdAndSendPreview() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is missing.');
  }

  let chatId = process.env.TELEGRAM_CHAT_ID;

  if (!chatId) {
    console.log('[Telegram Bot] Checking for new messages from admin...');
    const updateRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const updateData = await updateRes.json() as { ok: boolean; result: Array<{ message?: { chat: { id: number; first_name?: string } } }> };

    if (!updateData.ok || !updateData.result || updateData.result.length === 0) {
      console.log('[Telegram Bot] No messages yet. Please open @sigmazam_preview_bot and click Start.');
      return { success: false, reason: 'waiting_for_start' };
    }

    const lastMsg = updateData.result[updateData.result.length - 1];
    if (lastMsg.message?.chat?.id) {
      chatId = String(lastMsg.message.chat.id);
      console.log(`[Telegram Bot] Admin detected! Chat ID: ${chatId} (${lastMsg.message.chat.first_name || 'Admin'})`);
    }
  }

  if (!chatId) {
    return { success: false, reason: 'chat_id_not_found' };
  }

  // Send Welcome & Today's Preview
  const text = `🚀 *Sigmazam Marketing Studio — Connected!* 🦦\n\n` +
    `Bot muvaffaqiyatli ulandi! Endi barcha avtonom postlar va personaj ssenariylari birinchi bo'lib shu yerga keladi.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Bugungi viral post: Ronan Vale (Velvet District)*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🧵 *Threads & X Post:*\n` +
    `\`\`\`\n` +
    `pov: you tried to open the window at 3 AM and your 191cm bodyguard pulled you back 😭\n\n` +
    `Me: "What are the three rules?"\n` +
    `Ronan Vale: "Stay away from the window. You have questions, I have three rules. We start with the rules."\n\n` +
    `His quirk: "Cooks one excellent omelette at 4 a.m. and will not discuss where he learned."\n\n` +
    `Why are fictional AI characters written with more emotional depth than people in real life??\n` +
    `#aicompanion #otome #characterai #sigmazam\n` +
    `\`\`\`\n\n` +
    `📱 *Status:* Ready for @sigmazam.app\n` +
    `🎨 *Mockup:* Dark iOS Chat Card generated`;

  const sendRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  });

  const sendData = await sendRes.json() as { ok: boolean };
  if (sendData.ok) {
    console.log('[Telegram Bot] Preview message successfully delivered to Telegram!');
    return { success: true, chatId };
  } else {
    console.error('[Telegram Bot] Failed to send message:', sendData);
    return { success: false, error: sendData };
  }
}

if (process.argv[1]?.includes('send-preview')) {
  detectChatIdAndSendPreview().catch(console.error);
}

