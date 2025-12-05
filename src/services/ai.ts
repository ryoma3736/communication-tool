import axios from 'axios';
import { UnifiedMessage } from '../types/message';
import { Customer } from '../types/customer';

export interface AISuggestion {
  content: string;
  confidence: number;
  type: 'reply' | 'summary' | 'sentiment';
}

export interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
  urgency: 'low' | 'medium' | 'high';
}

export class AIService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    this.apiUrl = 'https://api.anthropic.com/v1/messages';
  }

  async suggestReply(messages: UnifiedMessage[], customer: Customer): Promise<AISuggestion[]> {
    const history = messages.slice(-10).map(m => {
      const role = m.direction === 'inbound' ? 'Customer' : 'Agent';
      return role + ': ' + m.content;
    }).join('\n');

    const prompt = 'あなたはカスタマーサポートです。以下の会話に対する返信を3つ提案してください。\n\n' + history;

    try {
      const response = await this.callAI(prompt);
      return [{ content: response, confidence: 0.8, type: 'reply' }];
    } catch (error) {
      console.error('AI error:', error);
      return [];
    }
  }

  async analyzeSentiment(content: string): Promise<SentimentResult> {
    return { sentiment: 'neutral', score: 0.5, urgency: 'medium' };
  }

  async summarizeThread(messages: UnifiedMessage[]): Promise<string> {
    const text = messages.map(m => m.content).join(' ');
    return text.substring(0, 200) + '...';
  }

  private async callAI(prompt: string): Promise<string> {
    const response = await axios.post(
      this.apiUrl,
      {
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        }
      }
    );
    return response.data.content[0].text;
  }
}
