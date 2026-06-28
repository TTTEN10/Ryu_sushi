/** FAQ for landing, Explore, and FAQ page. Order is most relevant → least. */
export const FAQ_ITEMS = [
  {
    q: 'What is SafePsy?',
    a: "SafePsy is a privacy-first mental wellness platform that combines ethical AI support (Dr. Safe) with blockchain-secured identity.\n\nYou own your data: we do not store it with third parties or use it to train AI models. Chat and summary data are encrypted at rest; keys are derived from your wallet and are not stored on our servers.",
  },
  {
    q: 'What can I do immediately?',
    a: 'Immediately after connecting:\n• create your AI identity\n• start chatting\n• build a persistent profile\n• experience memory/context continuity\n• explore identity-native interactions\n\nThe key is that value appears in under 30 seconds.\n\nConnect wallet → create identity → start chatting instantly.',
  },
  {
    q: 'Why should I care?',
    a: 'Today, most AI interactions are temporary, disconnected, and owned by platforms.\n\nSafePsy gives you:\n• a persistent identity\n• continuity across sessions\n• ownership of your profile and interactions\n• a more personal and contextual AI experience\n\nThe emotional value is: "This AI knows me because my identity persists."',
  },
  {
    q: 'Why is it different?',
    a: 'SafePsy is different because identity is native to the experience, not an add-on.\n\nMost AI apps:\n• reset context\n• depend on centralized accounts\n• treat users as sessions\n\nSafePsy treats users as persistent entities.\n\nKey differentiators:\n• wallet-native identity\n• portable ID token layer\n• persistent interactions\n• user-owned identity graph\n• AI experiences tied to identity, not accounts',
  },
  {
    q: 'What is My ID token?',
    a: 'My ID token is your SafePsy profile page (/profile). It shows your on-chain ID token (a soulbound record tied to your wallet), encrypted chat references, session history, and tools to export chat data or rotate encryption keys.\n\nAfter connecting your wallet and creating your Safe ID Token, open My ID token to view token details, manage encrypted data, and export or revoke chat references.',
  },
  {
    q: 'Can I try SafePsy without connecting a wallet?',
    a: 'Yes. You can chat instantly as a guest for a limited, session-style experience. Connecting a wallet unlocks decentralized identity flows and encrypted persistence tied to your keys.',
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
