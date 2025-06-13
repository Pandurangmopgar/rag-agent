# RAG Chat Assistant 🤖✨

A state-of-the-art Retrieval-Augmented Generation (RAG) chatbot built with Next.js 15, TypeScript, Tailwind CSS, and powered by modern AI technologies. This application combines the power of vector databases, AI embeddings, and conversational AI to create an intelligent assistant that can understand and respond to questions about your documents.

## 🌐 Live Demo

**Try the live application:** [https://rag-agent-eosin.vercel.app/](https://rag-agent-eosin.vercel.app/)

## 📁 Project Resources & Testing

### 🧪 Testing & Workflows
This project includes comprehensive testing resources and automated workflows:

- **`/tests/`** - Complete test suite covering all application features:
  - API endpoint testing
  - Document upload functionality
  - Chat functionality validation
  - Error handling scenarios
  - Performance benchmarks

- **`/Workflow/`** - Pre-configured N8N workflow files (`.json` format):
  - `rag-agent.json` - Main RAG chatbot workflow
  - `slack-bot-workflow.json` - Slack integration setup
  - `discordbot.json` - Discord bot configuration
  - Ready-to-import automation workflows for various platforms

- **`/test-image/`** - Sample test images for multimodal AI testing:
  - Various document formats (PDF screenshots, charts, diagrams)
  - Test cases for image analysis features
  - Sample images to validate vision capabilities

These resources are essential for understanding the full capabilities of the system and are particularly useful for evaluation and demonstration purposes.

## ✨ Features

- 🧠 **Advanced RAG Pipeline**: Sophisticated retrieval-augmented generation with semantic search
- 📄 **Document Processing**: Upload and analyze PDF, TXT, and MD files
- 🎨 **Modern UI/UX**: Beautiful, responsive interface with smooth animations using Framer Motion
- 🌙 **Dark/Light Mode**: Elegant theme switching with system preference detection
- 💾 **Chat Memory**: Persistent conversation history with localStorage
- 🚀 **Real-time Streaming**: Live responses with typing indicators and progress bars
- 📱 **Mobile Responsive**: Optimized for all screen sizes
- ⚡ **Performance Optimized**: Built with Next.js 15 App Router for maximum speed

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety and better development experience
- **Tailwind CSS v4** - Modern utility-first CSS framework
- **Framer Motion** - Smooth animations and transitions
- **shadcn/ui** - Beautiful, accessible UI components
- **Lucide React** - Modern icon library

### Backend & AI
- **Pinecone** - Vector database for semantic search
- **Google Gemini** - AI embeddings generation
- **N8N** - Workflow automation for AI responses
- **Formidable** - File upload handling

### Features
- **next-themes** - Theme management
- **GPT Tokenizer** - Text chunking and token counting
- **UUID** - Unique identifier generation

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Active accounts for:
  - Pinecone (vector database)
  - Google AI (for embeddings)
  - N8N (for workflow automation)

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd rag-chat-assistant
   npm install
   ```

2. **Set up environment variables**
   
   Copy `.env.example` to `.env.local` and configure:

   ```env
   # Pinecone Configuration
   PINECONE_API_KEY=your_pinecone_api_key_here
   PINECONE_ENVIRONMENT=your_pinecone_environment
   PINECONE_INDEX_NAME=your_pinecone_index_name

   # Google AI Configuration
   GOOGLE_API_KEY=your_google_ai_api_key_here

   # N8N Webhook Configuration
   NEXT_PUBLIC_N8N_WEBHOOK_URL=your_n8n_webhook_url_here
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `PINECONE_API_KEY` | Your Pinecone API key | ✅ | `12345678-1234-1234-1234-123456789012` |
| `PINECONE_ENVIRONMENT` | Pinecone environment region | ✅ | `us-west1-gcp-free` |
| `PINECONE_INDEX_NAME` | Name of your Pinecone index | ✅ | `rag-chatbot-index` |
| `GOOGLE_API_KEY` | Google AI API key for embeddings | ✅ | `AIza...` |
| `NEXT_PUBLIC_N8N_WEBHOOK_URL` | N8N webhook URL for AI responses | ✅ | `https://your-n8n.com/webhook/...` |

### Setting up Pinecone

1. Create a [Pinecone account](https://pinecone.io)
2. Create a new index with:
   - **Dimensions**: 768 (for text-embedding-004)
   - **Metric**: Cosine similarity
   - **Cloud Provider**: Your preference
3. Copy your API key and environment details

### Setting up Google AI

1. Visit [Google AI Studio](https://ai.google.dev)
2. Create an API key
3. Enable the Generative AI API

### Setting up N8N

1. Deploy N8N or use N8N Cloud
2. Create a webhook workflow that:
   - Receives POST requests with `{ question: string }`
   - Processes the question through your AI model
   - Returns `{ answer: string, sources?: string[] }`

## 🎯 Usage

### 💬 Chatting

1. **Start a conversation**: Type your question in the input field
2. **Upload documents**: Click the 📎 icon to upload PDF, TXT, or MD files
3. **View sources**: See which documents were used to generate responses
4. **Browse history**: Use the collapsible memory panel to view past conversations

### 📄 Document Upload

The system supports:
- **PDF files** (text extraction)
- **TXT files** (plain text)
- **MD files** (Markdown)

Documents are automatically:
1. **Chunked** into ~2000 token segments with 200 token overlap
2. **Embedded** using Google's text-embedding-004 model
3. **Stored** in Pinecone for semantic search

### 🧠 Memory System

- **Automatic saving**: Q&A pairs are saved to localStorage
- **Last 5 conversations**: Only recent interactions are kept
- **Click to recall**: Click any memory entry to reference it
- **Clear history**: Remove all stored conversations

## 🏗️ Project Structure

```
rag-chat-assistant/
├── rag-chat-ui/                  # Main application
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API routes
│   │   │   ├── ask/route.ts     # Chat endpoint
│   │   │   ├── upload/route.ts  # Document upload
│   │   │   └── image-analysis/  # Image analysis endpoint
│   │   ├── globals.css          # Global styles
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Main page
│   ├── components/              # React components
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── ChatBox.tsx         # Main chat interface
│   │   ├── MemoryPanel.tsx     # Conversation history
│   │   ├── MarkdownRenderer.tsx # Markdown formatting
│   │   └── theme-provider.tsx  # Theme management
│   ├── lib/                     # Utilities
│   │   ├── pinecone.ts         # Vector database client
│   │   ├── storage.ts          # Storage management
│   │   └── utils.ts            # Helper functions
│   └── public/                  # Static assets
├── Workflow/                     # N8N automation workflows
│   ├── rag-agent.json          # Main RAG workflow
│   ├── slack-bot-workflow.json # Slack integration
│   └── discordbot.json         # Discord bot setup
├── tests/                       # Comprehensive test suite
│   ├── rag-chat-test.js        # Full feature testing
│   └── api-tests/              # API endpoint tests
├── test-image/                  # Sample test images
│   ├── charts/                 # Chart and diagram samples
│   ├── documents/              # Document screenshots
│   └── mixed/                  # Various test cases
└── README.md                    # Project documentation
```

## 🎨 UI Features

### Animations
- **Smooth page transitions** with Framer Motion
- **Message animations** with spring physics
- **Typing indicators** with bouncing dots
- **Hover effects** on interactive elements
- **Theme transitions** with color interpolation

### Design System
- **Consistent spacing** using Tailwind's scale
- **Accessible colors** meeting WCAG AA standards
- **Responsive typography** adapting to screen size
- **Glass morphism effects** with backdrop blur
- **Gradient accents** for modern visual appeal

### Accessibility
- **Keyboard navigation** (Enter to send, Esc to close panels)
- **Screen reader support** with proper ARIA labels
- **Focus indicators** for all interactive elements
- **Color contrast compliance** in both themes
- **Reduced motion support** for sensitive users

## 🔍 API Endpoints

### POST `/api/ask`
Send a question to the AI assistant.

**Request:**
```json
{
  "question": "What is the main topic of the uploaded document?"
}
```

**Response:**
```json
{
  "answer": "The main topic is...",
  "sources": ["document1.pdf", "document2.txt"]
}
```

### POST `/api/upload`
Upload and process documents for the knowledge base.

**Request:**
- `multipart/form-data` with `document` field
- Supported: `.pdf`, `.txt`, `.md` files
- Max size: 10MB

**Response:**
```json
{
  "status": "ok",
  "chunks": 15,
  "message": "Successfully processed 15 chunks from document.pdf"
}
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your repository to Vercel
2. Add environment variables in project settings
3. Deploy automatically on push

### Docker
```bash
# Build the container
docker build -t rag-chatbot .

# Run with environment variables
docker run -p 3000:3000 --env-file .env.local rag-chatbot
```

### Manual Deployment
```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🔧 Configuration

### Customize Chunking
Edit `splitTextIntoChunks` in `/api/upload/route.ts`:
```typescript
const chunks = splitTextIntoChunks(fileContent, 2000, 200);
// maxTokens: 2000, overlap: 200
```

### Modify UI Theme
Update Tailwind CSS variables in `globals.css`:
```css
:root {
  --primary: your-color-here;
  --secondary: your-color-here;
}
```

### Adjust Memory Limit
Change the memory limit in `MemoryPanel.tsx`:
```typescript
const updatedMemories = [newMemory, ...memories].slice(0, 10); // Keep 10 instead of 5
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Join community discussions
- **Email**: [Your support email]

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org) - The React framework for production
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [shadcn/ui](https://ui.shadcn.com) - Beautiful UI components
- [Pinecone](https://pinecone.io) - Vector database platform
- [Google AI](https://ai.google.dev) - Generative AI services

---

This project demonstrates advanced RAG implementation with modern web technologies and comprehensive testing suite.
