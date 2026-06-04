/** FAQ for landing, Explore, and FAQ page. Order is most relevant → least. */
export const FAQ_ITEMS = [
  {
    q: 'What is SafePsy?',
    a: "SafePsy is a privacy-first mental wellness platform that combines ethical AI support (Dr. Safe) with blockchain-secured identity.\n\nYou own your data: we do not store it with third parties or use it to train AI models. Chat and summary data are encrypted at rest; keys are derived from your wallet and are not stored on our servers.",
  },
  {
    q: 'What can I do immediately?',
    a: 'Immediately after connecting your wallet:\n• start chatting with Dr. Safe\n• unlock private persistent chat (one-time setup)\n• save encrypted conversations across sessions\n• pick up where you left off with continuity\n\nThe key is that value appears in under 30 seconds.\n\nConnect wallet → unlock private chat → keep chatting with memory that belongs to you.',
  },
  {
    q: 'What does "unlock private persistent chat" mean?',
    a: 'It is a one-time setup after you connect your wallet. You do not need to understand blockchain jargon.\n\nWhat you get:\n• encrypted chat history that comes back when you return\n• conversations tied to your wallet, not a corporate account\n• keys derived from your wallet (not stored on SafePsy servers)\n\nWhat happens behind the scenes: SafePsy creates a soulbound on-chain identity record (a DID / Safe ID Token) linked to your wallet. That record anchors your encrypted data. The button says "Unlock private persistent chat" because that is the outcome you care about.',
  },
  {
    q: 'Why should I care?',
    a: 'Today, most AI interactions are temporary, disconnected, and owned by platforms.\n\nSafePsy gives you:\n• a persistent identity\n• continuity across sessions\n• ownership of your profile and interactions\n• a more personal and contextual AI experience\n\nThe emotional value is: "This AI knows me because my identity persists."',
  },
  {
    q: 'Why is it different?',
    a: 'SafePsy is different because your conversations can persist with you, not with a platform account.\n\nMost AI apps:\n• reset context when you leave\n• depend on centralized logins\n• treat you as a temporary session\n\nSafePsy ties continuity to your wallet:\n• private persistent chat after a one-time unlock\n• encrypted history you control\n• an on-chain identity record (DID) only where it adds trust, not as the headline',
  },
  {
    q: 'Can I try SafePsy without connecting a wallet?',
    a: 'Yes. You can chat instantly as a guest for a limited, session-style experience. Connecting a wallet lets you unlock private persistent chat: encrypted history tied to your keys, saved across sessions.',
  },
  {
    q: 'How is my data protected?',
    a: 'You control your keys—they are derived from your wallet and are not stored on SafePsy servers. Chat and summary data are encrypted at rest using AES-256-GCM; only ciphertext is stored. Data is transmitted over TLS 1.3 and sensitive content is encrypted client-side before sending. We do not log chat message content and we do not use your chats to train our models.',
  },
  {
    q: 'Is SafePsy a replacement for a therapist?',
    a: "No. The AI assistant is not a substitute for professional mental health care. It does not provide medical advice, diagnosis, or treatment.\n\nDr. Safe is built to support you between therapy sessions, when preparing for an appointment, organizing thoughts or emotions, or practicing coping tools. SafePsy complements licensed therapy; it does not replace it. Always consult licensed professionals for clinical decisions. If you are in crisis, contact a licensed professional or emergency services.",
  },
]
