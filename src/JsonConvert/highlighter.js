// 语法高亮工具类
export class SyntaxHighlighter {
  constructor() {
    // JSON词法规则
    this.jsonRules = [
      { type: 'string', pattern: /"(?:[^"\\]|\\.)*"/g, className: 'json-string' },
      { type: 'number', pattern: /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, className: 'json-number' },
      { type: 'boolean', pattern: /\b(?:true|false)\b/g, className: 'json-boolean' },
      { type: 'null', pattern: /\bnull\b/g, className: 'json-null' },
      { type: 'key', pattern: /"(?:[^"\\]|\\.)*"(?=\s*:)/g, className: 'json-key' },
      { type: 'punctuation', pattern: /[{}\[\],]/g, className: 'json-punctuation' },
      { type: 'colon', pattern: /:/g, className: 'json-colon' }
    ];

    // XML词法规则
    this.xmlRules = [
      { type: 'comment', pattern: /<!--[\s\S]*?-->/g, className: 'xml-comment' },
      { type: 'cdata', pattern: /<![CDATA[[\s\S]*?]]>/g, className: 'xml-cdata' },
      { type: 'doctype', pattern: /<!DOCTYPE[\s\S]*?>/gi, className: 'xml-doctype' },
      { type: 'processing', pattern: /<\?[\s\S]*?\?>/g, className: 'xml-processing' },
      // 修改标签名规则，支持中文字符
      { type: 'tag-name', pattern: /<\/?([a-zA-Z\u4e00-\u9fa5][\w\u4e00-\u9fa5:-]*)/g, className: 'xml-tag-name' },
      { type: 'attribute-name', pattern: /\s([a-zA-Z\u4e00-\u9fa5][\w\u4e00-\u9fa5:-]*)(?=\s*=)/g, className: 'xml-attr-name' },
      { type: 'attribute-value', pattern: /=\s*(["'])((?:\\.|(?!\1)[^\\])*?)\1/g, className: 'xml-attr-value' },
      // 简化标签符号匹配
      { type: 'tag-punctuation', pattern: /[<>]/g, className: 'xml-tag-punctuation' },
      { type: 'text', pattern: />[^<]+(?=<|$)/g, className: 'xml-text' }
    ];

    // YAML词法规则
    this.yamlRules = [
      { type: 'comment', pattern: /#.*$/gm, className: 'yaml-comment' },
      { type: 'document-start', pattern: /^---\s*$/gm, className: 'yaml-document' },
      { type: 'document-end', pattern: /^\.\.\.\s*$/gm, className: 'yaml-document' },
      { type: 'key', pattern: /^\s*([^:\s][^:]*?)(?=\s*:(?:\s|$))/gm, className: 'yaml-key' },
      { type: 'string', pattern: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g, className: 'yaml-string' },
      { type: 'number', pattern: /\b-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g, className: 'yaml-number' },
      { type: 'boolean', pattern: /\b(?:true|false|yes|no|on|off)\b/gi, className: 'yaml-boolean' },
      { type: 'null', pattern: /\b(?:null|~)\b/gi, className: 'yaml-null' },
      { type: 'list-item', pattern: /^\s*-(?=\s)/gm, className: 'yaml-list' },
      { type: 'colon', pattern: /:/g, className: 'yaml-colon' }
    ];
  }

  // 检测文本格式
  detectFormat(text) {
    text = text.trim();
    
    if (text.startsWith('<') && text.includes('>')) {
      return 'xml';
    }
    
    if ((text.startsWith('{') && text.endsWith('}')) || 
        (text.startsWith('[') && text.endsWith(']'))) {
      return 'json';
    }
    
    if (text.includes(':') && !text.startsWith('<')) {
      return 'yaml';
    }
    
    return 'json'; // 默认
  }

  // 高亮文本
  highlight(text, format) {
    if (!text) return '';
    
    const detectedFormat = format || this.detectFormat(text);
    let rules;
    
    switch (detectedFormat) {
      case 'xml':
        rules = this.xmlRules;
        break;
      case 'yaml':
        rules = this.yamlRules;
        break;
      default:
        rules = this.jsonRules;
    }
    
    return this.applyHighlighting(text, rules);
  }

  // 应用高亮规则
  applyHighlighting(text, rules) {
    const tokens = [];
    let lastIndex = 0;
    
    // 收集所有匹配的token
    rules.forEach(rule => {
      let match;
      rule.pattern.lastIndex = 0; // 重置正则表达式
      
      while ((match = rule.pattern.exec(text)) !== null) {
        tokens.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
          className: rule.className,
          type: rule.type
        });
      }
    });
    
    // 按位置排序并处理重叠
    tokens.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
    
    // 构建高亮HTML
    let result = '';
    let currentIndex = 0;
    
    tokens.forEach(token => {
      if (token.start >= currentIndex) {
        // 添加未高亮的文本
        if (token.start > currentIndex) {
          result += this.escapeHtml(text.slice(currentIndex, token.start));
        }
        
        // 添加高亮的token
        result += `<span class="${token.className}">${this.escapeHtml(token.text)}</span>`;
        currentIndex = token.end;
      }
    });
    
    // 添加剩余文本
    if (currentIndex < text.length) {
      result += this.escapeHtml(text.slice(currentIndex));
    }
    
    return result;
  }

  // HTML转义
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export const highlighter = new SyntaxHighlighter();