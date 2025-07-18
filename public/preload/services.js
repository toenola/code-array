const fs = require('node:fs')
const path = require('node:path')
const yaml = require('js-yaml') // 引入yaml库
const { XMLParser, XMLBuilder } = require('fast-xml-parser') // 引入XML解析库

// 格式类型常量
const FORMAT_TYPES = {
  JSON: 'json',
  YAML: 'yaml',
  XML: 'xml'
};

// 创建XML解析器和构建器实例
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true,
  isArray: (name, jpath, isLeafNode, isAttribute) => {
    // 某些标签可能需要始终作为数组处理
    const arrayElements = ['item', 'element', 'entry'];
    return arrayElements.includes(name);
  }
});

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: true,
  indentBy: "  ",
  suppressEmptyNode: true
});

// 通用格式化函数模板
function formatTemplate(text, parser, formatter, unescapeFunc, removeCommentsFunc) {
  // 如果输入为空，直接返回
  if (!text || !text.trim()) {
    console.log('🔧 formatTemplate: 输入为空，直接返回');
    return '';
  }
  
  console.log('🔧 formatTemplate: 开始格式化，文本前100字符:', text.substring(0, 100));
  
  // 1. 先尝试直接解析原文本
  try {
    console.log('🔧 formatTemplate: 步骤1 - 尝试直接解析原文本');
    const obj = parser(text);
    const result = formatter(obj);
    console.log('✅ formatTemplate: 步骤1成功 - 原文本解析成功');
    return result;
  } catch (e1) {
    console.log('❌ formatTemplate: 步骤1失败 - 原文本解析失败:', e1.message);
    
    // 2. 如果原文本解析失败，尝试去转义后解析
    try {
      console.log('🔧 formatTemplate: 步骤2 - 尝试去转义后解析');
      const unescaped = unescapeFunc ? unescapeFunc(text) : text;
      if (unescapeFunc) {
        console.log('🔧 formatTemplate: 去转义完成，文本前100字符:', unescaped.substring(0, 100));
      } else {
        console.log('🔧 formatTemplate: 无去转义函数，使用原文本');
      }
      const obj = parser(unescaped);
      const result = formatter(obj);
      console.log('✅ formatTemplate: 步骤2成功 - 去转义后解析成功');
      return result;
    } catch (e2) {
      console.log('❌ formatTemplate: 步骤2失败 - 去转义后解析失败:', e2.message);
      
      // 3. 如果去转义后解析失败，尝试去注释后解析
      try {
        console.log('🔧 formatTemplate: 步骤3 - 尝试去注释后解析');
        const noComments = removeCommentsFunc ? removeCommentsFunc(text) : text;
        if (removeCommentsFunc) {
          console.log('🔧 formatTemplate: 去注释完成，文本前100字符:', noComments.substring(0, 100));
        } else {
          console.log('🔧 formatTemplate: 无去注释函数，使用原文本');
        }
        const obj = parser(noComments);
        const result = formatter(obj);
        console.log('✅ formatTemplate: 步骤3成功 - 去注释后解析成功');
        return result;
      } catch (e3) {
        console.log('❌ formatTemplate: 步骤3失败 - 去注释后解析失败:', e3.message);
        
        // 4. 最后尝试去转义+去注释后解析
        try {
          console.log('🔧 formatTemplate: 步骤4 - 尝试去转义+去注释后解析');
          const unescaped = unescapeFunc ? unescapeFunc(text) : text;
          const noComments = removeCommentsFunc ? removeCommentsFunc(unescaped) : unescaped;
          console.log('🔧 formatTemplate: 去转义+去注释完成，文本前100字符:', noComments.substring(0, 100));
          const obj = parser(noComments);
          const result = formatter(obj);
          console.log('✅ formatTemplate: 步骤4成功 - 去转义+去注释后解析成功');
          return result;
        } catch (e4) {
          console.log('❌ formatTemplate: 步骤4失败 - 所有尝试都失败:', e4.message);
          console.log('🔧 formatTemplate: 抛出最后一个错误');
          // 所有尝试都失败，抛出最后一个错误
          throw e4;
        }
      }
    }
  }
}

// 通过 window 对象向渲染进程注入 nodejs 能力
window.services = {
  // 读文件
  readFile (file) {
    return fs.readFileSync(file, { encoding: 'utf-8' })
  },
  // 文本写入到下载目录
  writeTextFile (text) {
    const filePath = path.join(window.utools.getPath('downloads'), Date.now().toString() + '.txt')
    fs.writeFileSync(filePath, text, { encoding: 'utf-8' })
    return filePath
  },
  // 图片写入到下载目录
  writeImageFile (base64Url) {
    const matchs = /^data:image\/([a-z]{1,20});base64,/i.exec(base64Url)
    if (!matchs) return
    const filePath = path.join(window.utools.getPath('downloads'), Date.now().toString() + '.' + matchs[1])
    fs.writeFileSync(filePath, base64Url.substring(matchs[0].length), { encoding: 'base64' })
    return filePath
  },

  // 判断文本格式（JSON、YAML或XML）
  detectFormat(text) {
    text = text.trim();
    
    // 处理空文本或极短文本
    if (text.length < 5) {
      console.log('🔍 格式检测: 文本太短，默认为JSON');
      return FORMAT_TYPES.JSON;
    }
    
    // 启发式评分系统
    const scores = {
      json: 0,
      yaml: 0,
      xml: 0
    };
    
    console.log('🔍 格式检测开始，文本前100字符:', text.substring(0, 100));
    
    // JSON基本结构检测（提高权重）
    if ((text.startsWith('{') && text.endsWith('}')) || 
        (text.startsWith('[') && text.endsWith(']'))) {
      scores.json += 15; // 从10提高到15
      console.log('✅ JSON基本结构检测: +15分');
    }
    
    // XML声明检测
    if (text.startsWith('<?xml')) {
      scores.xml += 10;
      console.log('✅ XML声明检测: +10分');
    }
    
    // XML基本结构检测（只有真正以<开头且以>结尾的才是XML）
    if (text.startsWith('<') && (text.endsWith('>') || text.match(/>\s*$/))) {
      scores.xml += 5;
      console.log('✅ XML基本结构检测: +5分');
    }
    
    // 检测转义的XML文本（必须以<开头）
    if (text.startsWith('<') && text.includes('\\n') && text.includes('</')) {
      scores.xml += 8;
      console.log('✅ 转义XML检测: +8分');
    }
    
    // XML标签检测（包括转义情况）
    const xmlTagPattern = /<[^>]+>/g;
    const xmlTags = text.match(xmlTagPattern);
    if (xmlTags && xmlTags.length > 0) {
      const tagScore = Math.min(xmlTags.length, 5);
      scores.xml += tagScore;
      console.log(`✅ XML标签检测: 找到${xmlTags.length}个标签，+${tagScore}分`);
    }
    
    // 改进的YAML检测 - 排除JSON格式
    
    // 首先检查是否明显是JSON格式
    const isLikelyJson = (text.startsWith('{') && text.endsWith('}')) || 
                        (text.startsWith('[') && text.endsWith(']')) ||
                        text.includes('"') && text.includes(':');
    
    if (!isLikelyJson) {
      // YAML键值对检测（更严格，排除带引号的键）
      const yamlKeyPattern = /^\s*[a-zA-Z_][\w\s]*\s*:/gm;
      const yamlKeys = text.match(yamlKeyPattern);
      if (yamlKeys && yamlKeys.length > 0) {
        const keyScore = Math.min(yamlKeys.length, 6); // 降低权重
        scores.yaml += keyScore;
        console.log(`✅ YAML键值对检测: 找到${yamlKeys.length}个键，+${keyScore}分`);
      }
      
      // 转义YAML检测（包含\n且有键值对结构，但不是JSON）
      if (text.includes('\\n') && text.includes(':') && !text.startsWith('<')) {
        scores.yaml += 4; // 降低权重
        console.log('✅ 转义YAML检测: +4分');
      }
      
      // YAML缩进检测（处理转义的换行符）
      const textForIndentCheck = text.replace(/\\n/g, '\n');
      const indentedLines = (textForIndentCheck.match(/^\s+[^\s]/gm) || []).length;
      if (indentedLines > 0) {
        const indentScore = Math.min(indentedLines, 3);
        scores.yaml += indentScore;
        console.log(`✅ YAML缩进检测: 找到${indentedLines}行缩进，+${indentScore}分`);
      }
      
      // YAML列表项检测（处理转义的换行符）
      const listItems = (textForIndentCheck.match(/^\s*-\s+/gm) || []).length;
      if (listItems > 0) {
        const listScore = Math.min(listItems, 3);
        scores.yaml += listScore;
        console.log(`✅ YAML列表检测: 找到${listItems}个列表项，+${listScore}分`);
      }
    } else {
      console.log('⚠️ 检测到JSON特征，跳过YAML键值对检测');
    }
    
    // 尝试解析各种格式
    try {
      JSON.parse(text);
      scores.json += 8; // 提高JSON解析成功的权重
      console.log('✅ JSON解析成功: +8分');
    } catch (e) {
      console.log('❌ JSON解析失败');
    }
    
    // 只有在不是明显JSON格式时才尝试YAML解析
    if (!isLikelyJson) {
      try {
        yaml.load(text);
        scores.yaml += 5;
        console.log('✅ YAML解析成功: +5分');
      } catch (e) {
        console.log('❌ YAML解析失败，尝试去转义后解析');
        // YAML解析失败，尝试去转义后解析
        try {
          const unescaped = this.unescapeCommon(text);
          yaml.load(unescaped);
          scores.yaml += 3;
          console.log('✅ 去转义后YAML解析成功: +3分');
        } catch (e2) {
          console.log('❌ 去转义后YAML解析仍然失败');
        }
      }
    } else {
      console.log('⚠️ 检测到JSON特征，跳过YAML解析测试');
    }
    
    try {
      xmlParser.parse(text);
      scores.xml += 5;
      console.log('✅ XML解析成功: +5分');
    } catch (e) {
      console.log('❌ XML解析失败，尝试去转义后解析');
      try {
        const unescaped = this.unescapeCommon(text);
        xmlParser.parse(unescaped);
        scores.xml += 3;
        console.log('✅ 去转义后XML解析成功: +3分');
      } catch (e2) {
        console.log('❌ 去转义后XML解析仍然失败');
      }
    }
    
    // 打印最终得分
    console.log('📊 最终得分:', {
      JSON: scores.json,
      YAML: scores.yaml,
      XML: scores.xml
    });
    
    // 找出得分最高的格式
    const maxScore = Math.max(scores.json, scores.yaml, scores.xml);
    
    // 如果最高分太低，默认为JSON
    if (maxScore < 3) {
      console.log('⚠️ 所有格式得分都太低，默认为JSON');
      return FORMAT_TYPES.JSON;
    }
    
    // 返回得分最高的格式，JSON优先
    let detectedFormat;
    if (scores.json === maxScore) detectedFormat = FORMAT_TYPES.JSON;
    else if (scores.xml === maxScore) detectedFormat = FORMAT_TYPES.XML;
    else if (scores.yaml === maxScore) detectedFormat = FORMAT_TYPES.YAML;
    else detectedFormat = FORMAT_TYPES.JSON;
    
    console.log(`🎯 检测结果: ${detectedFormat.toUpperCase()}`);
    console.log('=====================================');
    
    return detectedFormat;
  },
  // JSON格式化
  formatJson (text) {
    return formatTemplate(
      text,
      (t) => JSON.parse(t),
      (obj) => JSON.stringify(obj, null, 2),
      (t) => this.unescapeJson(t),
      (t) => this.removeJsonComments(t)
    );
  },
  
  // YAML格式化
  formatYaml(text) {
    return formatTemplate(
      text,
      (t) => yaml.load(t),
      (obj) => yaml.dump(obj, { indent: 2, lineWidth: -1, noRefs: true }),
      (t) => this.unescapeYaml(t),
      (t) => this.removeYamlComments(t)
    );
  },
  
  // XML格式化
  formatXml(text) {
    // XML格式化前先进行去转义处理
    const unescapedText = this.unescapeXml(text);
    return formatTemplate(
      unescapedText,
      (t) => xmlParser.parse(t),
      (obj) => xmlBuilder.build(obj),
      (t) => this.unescapeXml(t),
      (t) => this.removeXmlComments(t)
    );
  },
  
  // 智能格式化（自动检测JSON、YAML或XML）
  formatText(text) {
    const format = this.detectFormat(text)
    if (format === 'json') {
      return this.formatJson(text)
    } else if (format === 'yaml') {
      return this.formatYaml(text)
    } else if (format === 'xml') {
      return this.formatXml(text)
    } else {
      throw new Error('无法识别的文本格式')
    }
  },
  
  // JSON最小化
  minifyJson (text) {
    try {
      const noComments = this.removeJsonComments(text)
      const obj = JSON.parse(noComments)
      return JSON.stringify(obj)
    } catch (e) {
      const obj = JSON.parse(text)
      return JSON.stringify(obj)
    }
  },
  
  // YAML最小化
  minifyYaml(text) {
    try {
      const obj = yaml.load(text)
      return yaml.dump(obj, {
        flowLevel: 0,
        indent: 2,
        noRefs: true
      })
    } catch (e) {
      throw new Error('无法解析的YAML格式: ' + e.message)
    }
  },
  
  // XML最小化
  minifyXml(text) {
    try {
      const obj = xmlParser.parse(text)
      const minifyBuilder = new XMLBuilder({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        format: false,
        suppressEmptyNode: true
      });
      return minifyBuilder.build(obj)
    } catch (e) {
      throw new Error('无法解析的XML格式: ' + e.message)
    }
  },
  
  // 智能最小化（自动检测JSON、YAML或XML）
  minifyText(text) {
    const format = this.detectFormat(text)
    if (format === 'json') {
      return this.minifyJson(text)
    } else if (format === 'yaml') {
      return this.minifyYaml(text)
    } else if (format === 'xml') {
      return this.minifyXml(text)
    } else {
      throw new Error('无法识别的文本格式')
    }
  },
  
  // JSON转义
  escapeJson(text) {
    try {
      const obj = JSON.parse(this.removeJsonComments(text));
      const str = JSON.stringify(obj);
      return JSON.stringify(str).slice(1, -1);
    } catch (e) {
      throw new Error('JSON转义失败: ' + e.message);
    }
  },

  // YAML转义
  escapeYaml(text) {
    try {
      const obj = yaml.load(text);
      const str = yaml.dump(obj);
      return JSON.stringify(str).slice(1, -1);
    } catch (e) {
      throw new Error('YAML转义失败: ' + e.message);
    }
  },

  // XML转义
  escapeXml(text) {
    try {
      const obj = xmlParser.parse(text);
      const str = xmlBuilder.build(obj);
      return JSON.stringify(str).slice(1, -1);
    } catch (e) {
      throw new Error('XML转义失败: ' + e.message);
    }
  },
  
  // 智能转义（自动检测JSON、YAML或XML）
  escapeText(text) {
    const format = this.detectFormat(text)
    if (format === 'json') {
      return this.escapeJson(text)
    } else if (format === 'yaml') {
      return this.escapeYaml(text)
    } else if (format === 'xml') {
      return this.escapeXml(text)
    } else {
      throw new Error('无法识别的文本格式')
    }
  },
  
  // 通用去转义函数
  unescapeCommon(text) {
    if (!text || typeof text !== 'string') return text;
    
    try {
      return text
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\b/g, '\b')
        .replace(/\\f/g, '\f')
    } catch (e) {
      console.error('通用去转义失败:', e.message);
      return text;
    }
  },
  
  // XML去转义
  unescapeXml(text) {
    try {
      // 先尝试去转义
      const unescaped = this.unescapeCommon(text);
      
      // 进行XML实体去转义
      const xmlUnescaped = unescaped
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
      
      // 验证去转义后是否为有效XML
      xmlParser.parse(xmlUnescaped);
      return xmlUnescaped;
    } catch (e) {
      // 如果去转义失败，尝试直接验证原文本
      try {
        xmlParser.parse(text);
        return text;
      } catch (e2) {
        // 如果原文本也无效，返回原文本
        return text;
      }
    }
  },

  // JSON去转义
  unescapeJson(text) {
    try {
      // 如果文本已经是有效的JSON，直接返回
      JSON.parse(text);
      return text;
    } catch (e) {
      // 如果不是有效JSON，尝试去转义
      try {
        const unescaped = this.unescapeCommon(text);
        // 验证去转义后是否为有效JSON
        JSON.parse(unescaped);
        return unescaped;
      } catch (e2) {
        // 如果去转义后仍然无效，返回原文本
        return text;
      }
    }
  },

  // YAML去转义
  unescapeYaml(text) {
    try {
      // 如果文本已经是有效的YAML，直接返回
      yaml.load(text);
      return text;
    } catch (e) {
      // 如果不是有效YAML，尝试去转义
      try {
        const unescaped = this.unescapeCommon(text);
        // 验证去转义后是否为有效YAML
        yaml.load(unescaped);
        return unescaped;
      } catch (e2) {
        // 如果去转义后仍然无效，返回原文本
        return text;
      }
    }
  },
  
  // 智能去转义
  unescapeText(text) {
    const format = this.detectFormat(text);
    
    if (format === 'json') {
      return this.unescapeJson(text);
    } else if (format === 'yaml') {
      return this.unescapeYaml(text);
    } else if (format === 'xml') {
      return this.unescapeXml(text);
    } else {
      return this.unescapeCommon(text);
    }
  },
  
  // 去除JSON注释
  removeJsonComments (text) {
    return text
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim()
  },
  
  // 去除YAML注释
  removeYamlComments(text) {
    return text
      .split('\n')
      .map(line => {
        const commentIndex = line.indexOf('#')
        if (commentIndex === -1) return line
        
        let inQuote = false
        let quoteChar = null
        for (let i = 0; i < commentIndex; i++) {
          const char = line[i]
          if ((char === '"' || char === "'") && (i === 0 || line[i-1] !== '\\')) {
            if (!inQuote) {
              inQuote = true
              quoteChar = char
            } else if (char === quoteChar) {
              inQuote = false
            }
          }
        }
        
        return inQuote ? line : line.substring(0, commentIndex).trimEnd()
      })
      .join('\n')
      .trim()
  },
  
  // 去除XML注释
  removeXmlComments(text) {
    return text.replace(/<!--[\s\S]*?-->/g, '').trim()
  },
  
  // 智能去除注释
  removeComments(text) {
    const format = this.detectFormat(text)
    if (format === 'json') {
      return this.removeJsonComments(text)
    } else if (format === 'yaml') {
      return this.removeYamlComments(text)
    } else if (format === 'xml') {
      return this.removeXmlComments(text)
    } else {
      throw new Error('无法识别的文本格式')
    }
  },
  
  // JSON转YAML
  jsonToYaml(text) {
    try {
      let jsonObj
      try {
        const noComments = this.removeJsonComments(text)
        jsonObj = JSON.parse(noComments)
      } catch (e) {
        jsonObj = JSON.parse(text)
      }
      
      return yaml.dump(jsonObj, {
        indent: 2,
        lineWidth: -1,
        noRefs: true
      })
    } catch (e) {
      throw new Error('JSON转YAML失败: ' + e.message)
    }
  },
  
  // YAML转JSON
  yamlToJson(text) {
    try {
      const yamlObj = yaml.load(text)
      return JSON.stringify(yamlObj, null, 2)
    } catch (e) {
      throw new Error('YAML转JSON失败: ' + e.message)
    }
  },
  
  // JSON转XML
  jsonToXml(text) {
    try {
      let jsonObj
      try {
        const noComments = this.removeJsonComments(text)
        jsonObj = JSON.parse(noComments)
      } catch (e) {
        jsonObj = JSON.parse(text)
      }
      
      if (Array.isArray(jsonObj)) {
        jsonObj = { "root": jsonObj }
      }
      
      return xmlBuilder.build(jsonObj)
    } catch (e) {
      throw new Error('JSON转XML失败: ' + e.message)
    }
  },
  
  // YAML转XML
  yamlToXml(text) {
    try {
      const yamlObj = yaml.load(text)
      const objToConvert = Array.isArray(yamlObj) ? { "root": yamlObj } : yamlObj
      return xmlBuilder.build(objToConvert)
    } catch (e) {
      throw new Error('YAML转XML失败: ' + e.message)
    }
  },
  
  // XML转JSON
  xmlToJson(text) {
    try {
      const cleanXml = this.removeXmlComments(text).trim();
      
      if (!cleanXml.startsWith('<')) {
        throw new Error('无效的XML格式');
      }
      
      const xmlObj = xmlParser.parse(cleanXml);
      
      if (typeof xmlObj === 'string') {
        throw new Error('XML解析失败');
      }
      
      return JSON.stringify(xmlObj, null, 2);
    } catch (e) {
      throw new Error('XML转JSON失败: ' + e.message);
    }
  },
  
  // XML转YAML
  xmlToYaml(text) {
    try {
      const cleanXml = this.removeXmlComments(text).trim();
      
      if (!cleanXml.startsWith('<')) {
        throw new Error('无效的XML格式');
      }
      
      const xmlObj = xmlParser.parse(cleanXml);
      
      if (typeof xmlObj === 'string') {
        throw new Error('XML解析失败');
      }
      
      return yaml.dump(xmlObj, {
        indent: 2,
        lineWidth: -1,
        noRefs: true
      });
    } catch (e) {
      throw new Error('XML转YAML失败: ' + e.message);
    }
  }
}