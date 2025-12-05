export interface QuickReplyTemplate {
  id: string;
  category: string;
  title: string;
  content: string;
  variables: string[];
  shortcut?: string;
  usageCount: number;
}

export class TemplateService {
  private templates: QuickReplyTemplate[] = [
    {
      id: 'greeting',
      category: '挨拶',
      title: 'お問い合わせありがとうございます',
      content: 'お問い合わせいただきありがとうございます。{{customer_name}}様のご連絡を確認いたしました。担当の{{agent_name}}が対応いたします。',
      variables: ['customer_name', 'agent_name'],
      shortcut: '/greeting',
      usageCount: 0
    },
    {
      id: 'investigating',
      category: '対応中',
      title: '確認中です',
      content: '{{customer_name}}様、ご連絡ありがとうございます。現在、ご質問の件について確認しております。確認でき次第、ご連絡いたします。',
      variables: ['customer_name'],
      shortcut: '/investigating',
      usageCount: 0
    },
    {
      id: 'resolved',
      category: '解決',
      title: '解決しました',
      content: '{{customer_name}}様、お待たせいたしました。ご質問の件について解決いたしました。他にご不明点がございましたら、お気軽にお問い合わせください。',
      variables: ['customer_name'],
      shortcut: '/resolved',
      usageCount: 0
    },
    {
      id: 'closing',
      category: 'クローズ',
      title: 'クローズのご挨拶',
      content: 'この度はお問い合わせいただき誠にありがとうございました。今後ともよろしくお願いいたします。',
      variables: [],
      shortcut: '/close',
      usageCount: 0
    }
  ];

  getAll(): QuickReplyTemplate[] {
    return this.templates;
  }

  getByCategory(category: string): QuickReplyTemplate[] {
    return this.templates.filter(t => t.category === category);
  }

  getById(id: string): QuickReplyTemplate | undefined {
    return this.templates.find(t => t.id === id);
  }

  render(template: QuickReplyTemplate, variables: Record<string, string>): string {
    let content = template.content;
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return content;
  }

  incrementUsage(id: string): void {
    const template = this.templates.find(t => t.id === id);
    if (template) {
      template.usageCount++;
    }
  }
}
