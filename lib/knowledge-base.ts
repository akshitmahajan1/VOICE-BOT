export type KnowledgeBaseEntry = {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category: string;
};

export const knowledgeBase: KnowledgeBaseEntry[] = [
  {
    id: "greeting",
    question: "Hello, how are you?",
    answer: "Hello! I'm doing great, thank you for asking. How can I help you today?",
    keywords: ["hello", "hi", "hey", "greetings"],
    category: "Greeting",
  },
  {
    id: "hours",
    question: "What are your business hours?",
    answer: "We are open Monday to Friday from 9 AM to 6 PM, and Saturday from 10 AM to 4 PM. We are closed on Sundays.",
    keywords: ["hours", "open", "close", "timing", "when"],
    category: "Business Hours",
  },
  {
    id: "contact",
    question: "How can I contact you?",
    answer: "You can reach us by phone at 1-800-HELP-NOW, email us at support@example.com, or use this chat. We respond within 24 hours.",
    keywords: ["contact", "call", "phone", "email", "reach"],
    category: "Contact",
  },
  {
    id: "services",
    question: "What services do you offer?",
    answer: "We offer customer support, technical assistance, billing inquiries, product information, and general guidance on our services.",
    keywords: ["services", "offer", "do", "provide", "available"],
    category: "Services",
  },
  {
    id: "pricing",
    question: "What is your pricing?",
    answer: "Our pricing varies based on the service. We have basic, standard, and premium plans. Please visit our website or contact us for detailed pricing information.",
    keywords: ["price", "cost", "pricing", "plan", "rate", "fee"],
    category: "Pricing",
  },
  {
    id: "payment",
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, PayPal, bank transfers, and digital wallets. All payments are secure and encrypted.",
    keywords: ["payment", "pay", "credit", "card", "accept", "method"],
    category: "Payment",
  },
  {
    id: "refund",
    question: "What is your refund policy?",
    answer: "We offer a 30-day money-back guarantee on all purchases. If you're not satisfied, contact us within 30 days for a full refund.",
    keywords: ["refund", "return", "money back", "guarantee", "policy"],
    category: "Refunds",
  },
  {
    id: "account",
    question: "How do I create an account?",
    answer: "Visit our website, click 'Sign Up', enter your email and password, verify your email, and you're all set. You can also sign up via Google or Facebook.",
    keywords: ["account", "create", "sign up", "register", "new user"],
    category: "Account",
  },
  {
    id: "password",
    question: "I forgot my password. What should I do?",
    answer: "Click 'Forgot Password' on the login page, enter your email, and we'll send you a reset link. Check your spam folder if you don't see it.",
    keywords: ["password", "forgot", "reset", "lost", "access"],
    category: "Account",
  },
  {
    id: "faq",
    question: "Do you have a FAQ page?",
    answer: "Yes! You can find our complete FAQ at www.example.com/faq. It covers most common questions about our products and services.",
    keywords: ["faq", "frequently asked", "common questions"],
    category: "Information",
  },
];

/**
 * Find the best matching knowledge base entry for a user query
 * @param userQuery The user's question
 * @returns The matching knowledge base entry or null if no match found
 */
export function findMatchingAnswer(userQuery: string): KnowledgeBaseEntry | null {
  const queryLower = userQuery.toLowerCase();

  // First, try exact or near-exact keyword matching
  for (const entry of knowledgeBase) {
    for (const keyword of entry.keywords) {
      if (queryLower.includes(keyword.toLowerCase())) {
        return entry;
      }
    }
  }

  // If no match found, return null
  return null;
}

/**
 * Get all knowledge base entries grouped by category
 * @returns Object with categories as keys and entries as values
 */
export function getEntriesByCategory(): Record<string, KnowledgeBaseEntry[]> {
  const grouped: Record<string, KnowledgeBaseEntry[]> = {};

  for (const entry of knowledgeBase) {
    if (!grouped[entry.category]) {
      grouped[entry.category] = [];
    }
    grouped[entry.category].push(entry);
  }

  return grouped;
}
