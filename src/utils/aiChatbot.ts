const FAQ_RESPONSES = {
  // Account & Authentication
  'sign up': 'To sign up: 1) Click "Join UniMarket" 2) Choose account type (Buyer/Seller/Both) 3) Enter university details 4) Verify your student email. Need help with verification?',
  'login': 'Having trouble logging in? Try: 1) Check your email/password 2) Reset password if needed 3) Clear browser cache 4) Contact support if issues persist.',
  'forgot password': 'To reset password: 1) Click "Forgot Password" on login 2) Enter your email 3) Check inbox for reset link 4) Follow instructions in email.',
  
  // Buying & Selling
  'how to buy': 'To buy items: 1) Browse marketplace 2) Click product you want 3) Message seller for details 4) Arrange payment & pickup through secure chat.',
  'how to sell': 'To sell items: 1) Go to "Sell Item" 2) Upload photos 3) Add title, description, price 4) Choose category 5) Publish listing. Sellers need approval first.',
  'seller approval': 'Seller approval: 1) Complete profile with student ID 2) Go to Profile → Request Verification 3) Admin reviews within 24-48 hours 4) Get notified of approval status.',
  
  // Messaging & Communication
  'messaging': 'All communication happens through secure encrypted chat. Click "Message Seller" on any product to start a conversation. Never share personal contact info!',
  'chat not working': 'Chat issues? Try: 1) Refresh the page 2) Check internet connection 3) Clear browser cache 4) Try different browser. Still having issues?',
  
  // Payments & Safety
  'payment': 'UniMarket uses secure in-app payments. Never pay outside the platform! Supported methods: Bank transfer, Mobile money, Cash on delivery (for verified users).',
  'safety': 'Stay safe: 1) Keep all communication in-app 2) Meet in public campus locations 3) Inspect items before paying 4) Report suspicious activity 5) Never share personal info.',
  
  // Technical Issues
  'app slow': 'App running slow? 1) Close other browser tabs 2) Clear cache & cookies 3) Check internet speed 4) Try incognito mode 5) Restart browser.',
  'notifications': 'Not getting notifications? 1) Check browser notification settings 2) Allow notifications for UniMarket 3) Check if notifications are enabled in your profile.',
  
  // Account Management
  'profile': 'To update profile: Go to Profile → Edit Profile. Add photo, bio, contact details. Verified profiles get more trust from other users.',
  'verification': 'Get verified: 1) Complete all profile fields 2) Upload clear student ID photo 3) Request verification 4) Wait for admin approval (24-48 hours).',
  
  // Orders & Transactions
  'orders': 'Track orders in Orders section. See purchase history, delivery status, and contact sellers. Rate sellers after successful transactions.',
  'refund': 'For refunds: 1) Contact seller first 2) If unresolved, report to admin 3) Provide transaction details 4) Admin will investigate and resolve.',
  
  // Categories & Search
  'categories': 'Browse by categories: Electronics, Books, Fashion, Furniture, Services, and more. Use search bar for specific items.',
  'search': 'Search tips: 1) Use specific keywords 2) Try different spellings 3) Browse categories 4) Filter by price range 5) Sort by newest/price.',
};

const QUICK_SOLUTIONS = {
  'cant login': 'Try resetting your password or clearing browser cache. Still stuck? Contact support.',
  'messages not sending': 'Check your internet connection and refresh the page. Messages are encrypted and may take a moment.',
  'payment failed': 'Ensure you have sufficient funds and try again. Contact your bank if issues persist.',
  'seller not responding': 'Sellers usually respond within 24 hours. Try messaging again or browse similar items.',
  'item not as described': 'Contact the seller first. If unresolved, report the issue to admin for investigation.',
  'account suspended': 'Check your email for suspension reason. Contact support to appeal or resolve the issue.',
};

const analyzeComplexQuestion = (input: string): {text: string, actionButtons?: Array<{label: string, path: string, variant?: 'default' | 'outline'}>} | null => {
  // Multi-step processes
  if (input.includes('step') || input.includes('process') || input.includes('how do i')) {
    if (input.includes('sell') && input.includes('first time')) {
      return {
        text: "**First-Time Seller Guide** 🎆\n\n**Step 1: Setup Your Account**\n• Complete profile with student ID\n• Add university details and photo\n• Request seller verification\n\n**Step 2: Create Your Listing**\n• Upload 3-5 clear, well-lit photos\n• Write detailed description (condition, size, brand)\n• Set competitive price (check similar items)\n• Choose the right category\n\n**Step 3: Manage Your Sale**\n• Respond to messages within 24 hours\n• Answer questions honestly\n• Arrange safe campus meetups\n• Use secure payment methods\n\n**💰 Pricing Tip:** Check 3-5 similar items to set competitive prices!",
        actionButtons: [
          { label: "Setup Profile", path: "/profile" },
          { label: "Start Selling", path: "/sell" },
          { label: "Browse Examples", path: "/marketplace", variant: "outline" }
        ]
      };
    }
    if (input.includes('buy') && (input.includes('safe') || input.includes('secure'))) {
      return {
        text: "Safe buying process: 1) Browse verified seller profiles (look for verification badge) 2) Read item description carefully 3) Check seller ratings/reviews 4) Ask questions through secure chat 5) Request additional photos if needed 6) Agree on price and meeting location 7) Meet in public campus area (library, cafeteria) 8) Inspect item thoroughly before paying 9) Use in-app payment when possible 10) Rate seller after transaction. Red flags: Pressure to pay outside app, meet off-campus, or share personal info."
      };
    }
  }
  
  // Problem-solving scenarios
  if (input.includes('what if') || input.includes('what should i do')) {
    if (input.includes('seller') && (input.includes('respond') || input.includes('reply'))) {
      return {
        text: "**When Sellers Don't Respond** 💬\n\n**Be Patient First:**\n• Wait 24-48 hours (students are busy!)\n• Remember: exams, classes, work\n• Check their 'last seen' status\n\n**Follow-Up Strategy:**\n• Send one polite reminder\n• Ask a specific question about the item\n• Mention you're still interested\n\n**After 3 Days:**\n• Look for similar items from other sellers\n• Consider reporting if it's a pattern\n• Leave honest feedback for future buyers\n\n**🎆 Pro Tip:** Sellers with ⭐ higher ratings usually respond faster!",
        actionButtons: [
          { label: "Find Similar Items", path: "/marketplace" },
          { label: "Check Messages", path: "/messages", variant: "outline" }
        ]
      };
    }
    if (input.includes('scam') || input.includes('fraud') || input.includes('fake')) {
      return { text: "If you suspect fraud: 🚨 IMMEDIATE STEPS: 1) Don't send money 2) Screenshot all conversations 3) Report user immediately 4) Contact admin with evidence 5) If money was sent, contact your bank. WARNING SIGNS: Asks for payment outside app, wants to meet off-campus, price too good to be true, poor grammar/spelling, pressures quick payment, no student verification. Always trust your instincts!" };
    }
  }
  
  // Comparison questions
  if (input.includes('better') || input.includes('vs') || input.includes('compare')) {
    if (input.includes('payment')) {
      return {
        text: "Payment method comparison: 💳 **In-app payment** (RECOMMENDED): Secure, tracked, dispute protection, automatic receipts. 🏦 **Bank transfer**: Good for larger amounts, requires trust, get receipt. 📱 **Mobile money**: Quick for small amounts, verify details carefully. 💰 **Cash**: Only for verified users, meet in public, bring exact change. ❌ **NEVER**: Gift cards, cryptocurrency, wire transfers, or payments to personal accounts outside the app.",
        actionButtons: [{ label: "View Wallet", path: "/wallet" }]
      };
    }
  }
  
  // Troubleshooting complex issues
  if (input.includes('still') || input.includes('tried') || input.includes('doesnt work')) {
    return {
      text: "Advanced troubleshooting: If basic fixes didn't work, try: 1) **Different browser**: Chrome, Firefox, Safari, Edge 2) **Incognito/Private mode**: Rules out extensions 3) **Different device**: Phone, tablet, computer 4) **Different network**: Mobile data vs WiFi 5) **Clear everything**: Cache, cookies, local storage 6) **Disable extensions**: Ad blockers can interfere 7) **Check university network**: Some campus WiFi blocks certain features 8) **Contact support**: Provide browser version, device type, exact error messages, and steps you've tried.",
      actionButtons: [{ label: "Settings", path: "/settings" }]
    };
  }
  
  return null;
};

const generateNaturalResponse = (input: string): {text: string, actionButtons?: Array<{label: string, path: string, variant?: 'default' | 'outline'}>} | null => {
  // Greetings
  if (input.match(/^(hi|hello|hey|good morning|good afternoon)$/)) {
    return {
      text: "Hello! 👋 I'm your UniMarket assistant. How can I help you today?",
      actionButtons: [{ label: "Browse Items", path: "/marketplace" }]
    };
  }

  if (input.includes('how are you')) {
    return { text: "I'm doing great, thanks for asking! 😊 I'm here to help you with anything UniMarket-related. How are you doing today?" };
  }

  if (input.includes('thank')) {
    return { text: "You're very welcome! 😊 Is there anything else you'd like to know about UniMarket?" };
  }

  if (input.includes('want to buy') || input.includes('looking for')) {
    return {
      text: "**Great! Let's help you find what you need** 🛍️\n\n• Browse by categories\n• Use filters to narrow results\n• Check seller ratings\n• Ask questions before buying\n\nWhat are you looking for?",
      actionButtons: [{ label: "Browse All Items", path: "/marketplace" }]
    };
  }

  if (input.includes('want to sell') || input.includes('make money')) {
    return {
      text: "**Awesome! Selling on UniMarket is easy** 💰\n\n• Complete your profile first\n• Get verified as a seller\n• Take great photos\n• Write clear descriptions\n\nWhat do you want to sell?",
      actionButtons: [{ label: "Start Selling", path: "/sell" }]
    };
  }

  return null;
};

export const getAIResponse = async (userInput: string, context: string[] = []): Promise<{text: string, actionButtons?: Array<{label: string, path: string, variant?: 'default' | 'outline'}>}> => {
  const input = userInput.toLowerCase().trim();
  const contextStr = context.join(' ').toLowerCase();
  
  const naturalResponse = generateNaturalResponse(input);
  if (naturalResponse) return naturalResponse;
  
  // Check for follow-up questions based on context
  if (contextStr.includes('sell') && (input.includes('how') || input.includes('next') || input.includes('then'))) {
    return {
      text: "**Next Steps for Selling:**\n\n• **Complete your profile** - Add student ID and university details\n• **Request verification** - Go to Profile → Request Verification\n• **Wait for approval** - Usually takes 24-48 hours\n• **Create your first listing** - Click 'Sell Item' once approved\n\n**Pro Tips:**\n• Use good lighting for photos\n• Write detailed descriptions\n• Price competitively by checking similar items\n• Respond to messages quickly",
      actionButtons: [
        { label: "Complete Profile", path: "/profile" },
        { label: "Browse Examples", path: "/marketplace", variant: "outline" }
      ]
    };
  }
  
  if (contextStr.includes('buy') && (input.includes('safe') || input.includes('tips') || input.includes('how'))) {
    return {
      text: "**Safe Buying Guide:**\n\n**Before Buying:**\n• Check seller's verification badge ✓\n• Read their reviews and ratings\n• Ask questions about condition, size, etc.\n\n**During Transaction:**\n• Meet in public campus locations\n• Inspect item before paying\n• Use in-app payment when possible\n\n**Red Flags to Avoid:**\n❌ Asks to pay outside the app\n❌ Wants to meet off-campus\n❌ Price seems too good to be true\n❌ Pressures for immediate payment",
      actionButtons: [
        { label: "Start Shopping", path: "/marketplace" },
        { label: "Safety Guidelines", path: "/learn-more", variant: "outline" }
      ]
    };
  }
  
  // Try complex question analysis first
  const complexResponse = analyzeComplexQuestion(input);
  if (complexResponse) return complexResponse;
  
  // Check for exact FAQ matches with action buttons
  for (const [key, response] of Object.entries(FAQ_RESPONSES)) {
    if (input.includes(key)) {
      const buttons = [];
      if (key.includes('sign up')) buttons.push({ label: "Sign Up Now", path: "/auth" });
      if (key.includes('login')) buttons.push({ label: "Go to Login", path: "/auth" });
      if (key.includes('how to buy')) buttons.push({ label: "Browse Marketplace", path: "/marketplace" });
      if (key.includes('how to sell')) buttons.push({ label: "Start Selling", path: "/sell" }, { label: "View Profile", path: "/profile", variant: "outline" });
      if (key.includes('messaging')) buttons.push({ label: "View Messages", path: "/messages" });
      if (key.includes('orders')) buttons.push({ label: "My Orders", path: "/orders" });
      if (key.includes('profile')) buttons.push({ label: "Edit Profile", path: "/profile" });
      
      return { text: response, actionButtons: buttons.length > 0 ? buttons : undefined };
    }
  }
  
  // Check for quick solutions
  for (const [key, solution] of Object.entries(QUICK_SOLUTIONS)) {
    if (input.includes(key)) {
      const buttons = [];
      if (key.includes('login')) buttons.push({ label: "Try Login", path: "/auth" });
      if (key.includes('messages')) buttons.push({ label: "Open Messages", path: "/messages" });
      
      return { text: solution, actionButtons: buttons.length > 0 ? buttons : undefined };
    }
  }
  
  // Enhanced keyword responses
  if (input.includes('help') || input.includes('support')) {
    return {
      text: "I'm here to help! I can assist with: Account setup, Buying/Selling, Messaging, Payments, Technical issues, Safety tips. What specific area do you need help with?",
      actionButtons: [
        { label: "Browse Marketplace", path: "/marketplace" },
        { label: "My Profile", path: "/profile", variant: "outline" }
      ]
    };
  }
  
  if (input.includes('contact') || input.includes('phone') || input.includes('email')) {
    return {
      text: "For safety, never share personal contact info! All communication should happen through UniMarket's secure chat. This protects both buyers and sellers.",
      actionButtons: [{ label: "Open Messages", path: "/messages" }]
    };
  }
  
  if (input.includes('price') || input.includes('cost') || input.includes('fee')) {
    return {
      text: "UniMarket is free to use! No listing fees or commissions. We only charge small payment processing fees for transactions. Sellers keep most of their earnings.",
      actionButtons: [{ label: "Start Selling", path: "/sell" }]
    };
  }
  
  if (input.includes('delivery') || input.includes('shipping')) {
    return {
      text: "Most transactions are university pickup/delivery. Arrange meeting spots through secure chat. Some sellers offer university delivery for small fee. Always meet in safe, public locations.",
      actionButtons: [{ label: "Browse Items", path: "/marketplace" }]
    };
  }
  
  if (input.includes('report') || input.includes('scam') || input.includes('fraud')) {
    return { text: "To report issues: 1) Go to the user's profile 2) Click 'Report User' 3) Provide details 4) Admin will investigate. For urgent safety concerns, contact campus security." };
  }
  
  if (input.includes('university') || input.includes('student')) {
    return {
      text: "UniMarket is exclusively for university students. You need a valid student email to sign up. This ensures a trusted community of verified students.",
      actionButtons: [{ label: "Join Now", path: "/auth" }]
    };
  }
  
  // Intelligent fallback for unrecognized questions
  if (input.includes('?') || input.includes('how') || input.includes('why') || input.includes('what') || input.includes('when') || input.includes('where')) {
    return {
      text: `I understand you're asking about something specific. While I may not have the exact answer, here are some options:

🔍 **Try rephrasing**: Use keywords like "buy", "sell", "payment", "message", "account"
📚 **Common topics I can help with**:
   • Account setup and verification
   • Buying and selling processes
   • Payment methods and safety
   • Messaging and communication
   • Technical troubleshooting
   • Safety guidelines

💬 **For specific issues**: Describe your problem step-by-step
🆘 **Need human help**: Contact support through the app settings

What specific area would you like help with?`,
      actionButtons: [
        { label: "Browse Marketplace", path: "/marketplace" },
        { label: "My Account", path: "/profile", variant: "outline" },
        { label: "Settings", path: "/settings", variant: "outline" }
      ]
    };
  }
  
  // Conversational fallback
  const responses = [
    "I'm not sure I understand that completely, but I'm here to help! 😊",
    "Could you tell me more about what you're looking for? 🤔",
    "I want to make sure I give you the best help possible! 💪"
  ];
  
  return {
    text: `${responses[Math.floor(Math.random() * responses.length)]}\n\n**I can chat about:**\n\n🛍️ **Shopping & Buying**\n💰 **Selling & Earning**\n👥 **Community & Safety**\n⚙️ **Platform Help**\n\n**Just talk naturally!** Ask me:\n• "What's the best way to sell textbooks?"\n• "I'm looking for a cheap laptop"\n• "How do I know if a seller is trustworthy?"`,
    actionButtons: [
      { label: "Explore Marketplace", path: "/marketplace" },
      { label: "Start Selling", path: "/sell" },
      { label: "My Profile", path: "/profile", variant: "outline" }
    ]
  };
};