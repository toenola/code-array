import { useEffect, useState, useRef, useCallback } from 'react'
import './index.css'


export default function JsonConvert({ enterAction }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [errorPosition, setErrorPosition] = useState(null)
  const textareaRef = useRef(null)
  const lineNumbersRef = useRef(null) // 添加行号容器引用

  // 添加滚动同步处理
  useEffect(() => {
    const textarea = textareaRef.current;
    const lineNumbers = lineNumbersRef.current;

    if (!textarea || !lineNumbers) return;

    const handleScroll = () => {
      // 同步滚动位置
      lineNumbers.scrollTop = textarea.scrollTop;
    };

    textarea.addEventListener('scroll', handleScroll);
    return () => textarea.removeEventListener('scroll', handleScroll);
  }, []);

  const renderLineNumbers = useCallback(() => {
  if (!textareaRef.current) return null;

  const textarea = textareaRef.current;
  const style = window.getComputedStyle(textarea);

  // 使用更精确的计算方式
  const lineHeight = parseFloat(style.lineHeight);
  const fontSize = parseFloat(style.fontSize);
  const paddingTop = parseFloat(style.paddingTop);

  // 计算需要补偿的行数（向上取整）
  const offsetLines = Math.ceil(paddingTop / lineHeight);

  const paddingLeft = parseInt(style.paddingLeft);
  const paddingRight = parseInt(style.paddingRight);
  const textareaWidth = textarea.clientWidth - paddingLeft - paddingRight;

  const measureSpan = document.createElement('span');
  measureSpan.style.visibility = 'hidden';
  measureSpan.style.position = 'absolute';
  measureSpan.style.whiteSpace = 'nowrap';
  measureSpan.style.fontSize = fontSize + 'px';
  measureSpan.style.fontFamily = style.fontFamily;
  measureSpan.style.fontWeight = style.fontWeight;
  document.body.appendChild(measureSpan);

  const lines = text.split('\n');
  const lineNumbers = [];

  // 添加顶部占位补偿
  for (let i = 0; i < offsetLines; i++) {
    lineNumbers.push(
      <div
        key={`offset-${i}`}
        className="line-number"
        style={{ height: `${lineHeight}px`, minHeight: `${lineHeight}px` }}
      ></div>
    );
  }

  lines.forEach((line, index) => {
    if (line.trim() === '') {
      lineNumbers.push(
        <div key={`line-${index}`} className="line-number">{index + 1}</div>
      );
      return;
    }

    measureSpan.textContent = line;
    const textWidth = measureSpan.offsetWidth;
    const lineCount = Math.ceil(textWidth / textareaWidth) || 1;

    for (let i = 0; i < lineCount; i++) {
      lineNumbers.push(
        <div key={`line-${index}-${i}`} className="line-number">
          {i === 0 ? index + 1 : ''}
        </div>
      );
    }
  });

  document.body.removeChild(measureSpan);

  return <div className="line-numbers">{lineNumbers}</div>;
}, [text]);

  // 修复useEffect依赖问题
  useEffect(() => {
    // 处理uTools进入动作
    const handleEnter = (action) => {
      if (action.type === 'paste') {
        setText(action.payload);
        try {
          smartFormatJson(action.payload);
        } catch (e) {
          console.error('智能格式化失败:', e);
          highlightJsonError(action.payload, e);
        }
      } else if (action.type === 'open') {
        try {
          window.services.readFile(action.payload.path).then(content => {
            setText(content);
            try {
              smartFormatJson(content);
            } catch (e) {
              console.error('智能格式化失败:', e);
              highlightJsonError(content, e);
            }
          }).catch(err => {
            console.error('读取文件失败:', err);
            setError('读取文件错误: ' + err.message);
          });
        } catch (e) {
          console.error('window.services.readFile 调用失败:', e);
          setError('服务调用错误: ' + e.message);
        }
      }
    };

    if (window.utools) {
      window.utools.onPluginEnter(handleEnter);
      return () => {
        window.utools.offPluginEnter(handleEnter);
      };
    }
  }, []); 

  useEffect(() => {
    // 添加enterAction空值检查
    if (!enterAction) return;
    
    // 处理从其他应用粘贴过来的内容
    if (enterAction.type === 'over') {
      setText(enterAction.payload)
      try {
        // 尝试智能格式化JSON
        const formatted = smartFormatJson(enterAction.payload)
        setText(formatted)
        setError('')
        setErrorPosition(null)
      } catch (err) {
        // 移除重复的setError调用
        highlightJsonError(enterAction.payload, err)
      }
    }
    // 处理从文件打开的内容
    else if (enterAction.type === 'files') {
      // 添加payload存在性检查
      if (!enterAction.payload || enterAction.payload.length === 0) {
        setError('未找到文件内容');
        return;
      }
      const filePath = enterAction.payload[0].path
      try {
        const content = window.services.readFile(filePath)
        setText(content)
        try {
          // 尝试智能格式化JSON
          const formatted = smartFormatJson(content)
          setText(formatted)
          setError('')
          setErrorPosition(null)
        } catch (err) {
          // 移除重复的setError调用
          highlightJsonError(content, err)
        }
      } catch (err) {
        setError('读取文件错误: ' + err.message)
      }
    }
  }, [enterAction])

  // 智能格式化JSON - 智能格式化JSON - 修复版（重新加入注释移除步骤）
  const smartFormatJson = (jsonText) => {
    // 步骤1: 首先移除注释
    let processedText;
    try {
      processedText = window.services.removeJsonComments(jsonText);
    } catch (e) {
      console.error('移除注释失败:', e);
      processedText = jsonText; // 使用原始文本继续处理
    }
    let isUnescaped = false;

    // 步骤2: 尝试去除转义
    try {
      processedText = window.services.unescapeJson(processedText);
      isUnescaped = true;
    } catch (e) {
      // 去除转义失败时继续使用原始文本
    }

    // 步骤3: 替换中文标点为英文标点
    processedText = replaceChinesePunctuation(processedText);

    // 步骤4: 移除对象/数组末尾多余的逗号
    processedText = removeTrailingCommas(processedText);

    // 步骤5: 尝试解析处理后的JSON
    try {
      const obj = JSON.parse(processedText);
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      // 如果之前未尝试去除转义，现在尝试
      if (!isUnescaped) {
        try {
          const unescapedText = window.services.unescapeJson(processedText);
          const obj = JSON.parse(unescapedText);
          return JSON.stringify(obj, null, 2);
        } catch (e2) {
          // 步骤6: 尝试补全缺失的括号/方括号
          try {
            const balancedText = balanceBrackets(unescapedText);
            const obj = JSON.parse(balancedText);
            return JSON.stringify(obj, null, 2);
          } catch (e3) {
            // 所有尝试失败，抛出原始错误
            throw e;
          }
        }
      } else {
        // 步骤6: 尝试补全缺失的括号/方括号
        try {
          const balancedText = balanceBrackets(processedText);
          const obj = JSON.parse(balancedText);
          return JSON.stringify(obj, null, 2);
        } catch (e2) {
          // 所有尝试失败，抛出原始错误
          throw e;
        }
      }
    }
  };

  //  修改为智能格式化（支持JSON和YAML）
  const smartFormatText = (text) => {
    try {
      return window.services.formatText(text);
    } catch (e) {
      throw e;
    }
  };

  // 替换中文标点为英文标点
  const replaceChinesePunctuation = (text) => {
    return text
      .replace(/，/g, ',')      // 中文逗号替换为英文逗号
      .replace(/“|”/g, '"')   // 中文引号替换为英文引号
      .replace(/‘|’/g, '"')   // 中文单引号替换为英文引号
      .replace(/；/g, ';')      // 中文分号替换为英文分号
      .replace(/：/g, ':');     // 中文冒号替换为英文冒号
  };

  // 移除对象/数组末尾多余的逗号
  const removeTrailingCommas = (text) => {
    // 移除对象中最后一个属性后的逗号
    text = text.replace(/,(\s*[\]}])/g, '$1');
    // 移除数组中最后一个元素后的逗号
    text = text.replace(/,(\s*[\]])/g, '$1');
    return text;
  };

  // 平衡括号和方括号（优化版）
  const balanceBrackets = (text) => {
    const stack = [];
    const bracketPairs = { '{': '}', '[': ']' };
    const closingBrackets = new Set(['}', ']']);

    // 分析括号平衡
    for (const char of text) {
      if (char === '{' || char === '[') {
        stack.push(char);
      } else if (closingBrackets.has(char)) {
        if (stack.length === 0) continue; // 忽略多余的闭括号
        const opening = stack.pop();
        if (bracketPairs[opening] !== char) {
          // 括号类型不匹配，修复为正确的类型
          text = text.substring(0, text.indexOf(char)) + bracketPairs[opening] + text.substring(text.indexOf(char) + 1);
        }
      }
    }

    // 补全剩余的开括号
    while (stack.length > 0) {
      const opening = stack.pop();
      text += bracketPairs[opening];
    }

    return text;
  };

  // 补全缺失的引号 - 修复引号转义
  const completeQuotes = (text) => {
    let inString = false;
    let escaped = false;
    let result = '';

    for (const char of text) {
      if (char === '"' && !escaped) {
        inString = !inString;
      } else if (char === '\\' && inString) {
        escaped = !escaped;
      } else {
        escaped = false;
      }
      result += char;
    }

    // 如果结束时仍在字符串中，补全引号
    if (inString) {
      result += '"';
    }

    return result;
  };

  // 修正JSON语法（添加缺失的逗号等）
  const correctJsonSyntax = (text) => {
    // 简单的标记化处理
    const tokens = text.match(/([{}[\]]|\"[^\"]*\"|\d+|true|false|null|,|:)/g) || [];
    const result = [];
    const stack = [];
    const opening = new Set(['{', '[']);
    const closing = new Set(['}', ']']);
    const values = new Set(['true', 'false', 'null']);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const nextToken = tokens[i + 1];
      result.push(token);

      if (opening.has(token)) {
        stack.push(token);
      } else if (closing.has(token)) {
        stack.pop();
      } else if (token === '"' && nextToken && nextToken !== ':') {
        // 如果字符串后没有冒号，添加逗号
        result.push(',');
      } else if ((token === '}' || token === ']') && nextToken && opening.has(nextToken)) {
        // 如果对象/数组后是新的对象/数组，添加逗号
        result.push(',');
      } else if (values.has(token.toLowerCase()) && nextToken && !closing.has(nextToken) && nextToken !== ',') {
        // 如果值后面没有逗号或闭括号，添加逗号
        result.push(',');
      }
    }

    return result.join('');
  };

  // 定位JSON错误位置
  const highlightJsonError = (jsonText, error) => {
    // 增强错误位置提取逻辑，支持多种错误消息格式
    const positionMatch = error.message.match(/(position|at position|index)\s+(\d+)/i);
    if (positionMatch && positionMatch[2]) {
      const position = parseInt(positionMatch[2], 10);
      setErrorPosition(position);
      
      // 获取错误行号和列号
      const textBeforeError = jsonText.substring(0, position);
      const errorLine = textBeforeError.split('\n').length;
      const errorColumn = textBeforeError.split('\n').pop().length + 1;
      
      // 更新错误消息，包含行号和列号
      setError(`JSON格式错误 (第 ${errorLine} 行, 第 ${errorColumn} 列): ${error.message}`);
      
      // 使用requestAnimationFrame确保DOM更新后执行
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          // 确保文本区域已渲染最新内容
          textareaRef.current.value = jsonText;
          // 设置光标位置
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(position, position);
          // 滚动到错误位置
          textareaRef.current.scrollTop = 
            (errorLine - 5) * textareaRef.current.scrollHeight / textareaRef.current.value.split('\n').length;
        }
      });
    } else {
      setErrorPosition(null);
      setError('JSON格式错误: ' + error.message);
    }
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    setText(value)
    // 清除错误标记
    if (textareaRef.current) {
      textareaRef.current.classList.remove('has-error')
    }
    setErrorPosition(null)
    setError('')
  }

  // 修改handleSmartFormat函数使用新的智能格式化方法
  function handleSmartFormat() {
    try {
      const formatted = smartFormatText(text);
      if (textareaRef.current && textareaRef.current.value !== formatted) {
        // 优化：避免全选操作，直接替换文本内容
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        
        // 使用更高效的API替换文本
        textarea.setRangeText(formatted, 0, textarea.value.length);
        textarea.focus();
        textarea.setSelectionRange(start, start);
        setText(textarea.value);
      }
      setError('');
      setErrorPosition(null);
      if (textareaRef.current) {
        textareaRef.current.classList.remove('has-error');
      }
    } catch (err) {
      // 传递当前文本到错误处理函数
      highlightJsonError(text, err);
    }
  }

  // 修改其他处理函数使用新的服务方法
  const handleMinify = () => {
    try {
      const minified = window.services.minifyText(text)
      setText(minified)
      setError('')
      setErrorPosition(null)
      if (textareaRef.current) {
        textareaRef.current.classList.remove('has-error')
      }
    } catch (err) {
      highlightJsonError(text, err)
    }
  }

  const handleEscape = () => {
    try {
      const escaped = window.services.escapeText(text)
      setText(escaped)
      setError('')
      setErrorPosition(null)
      if (textareaRef.current) {
        textareaRef.current.classList.remove('has-error')
      }
    } catch (err) {
      highlightJsonError(text, err)
    }
  }

  const handleUnescape = () => {
    try {
      const unescaped = window.services.unescapeText(text)
      setText(unescaped)
      setError('')
      setErrorPosition(null)
      if (textareaRef.current) {
        textareaRef.current.classList.remove('has-error')
      }
    } catch (err) {
      highlightJsonError(text, err)
    }
  }

  const handleRemoveComments = () => {
    try {
      const noComments = window.services.removeComments(text)
      setText(noComments)
      setError('')
      setErrorPosition(null)
      if (textareaRef.current) {
        textareaRef.current.classList.remove('has-error')
      }
    } catch (err) {
      setError('处理错误: ' + err.message)
    }
  }

  // 添加JSON转YAML功能
  const handleJsonToYaml = () => {
    try {
      const yamlText = window.services.jsonToYaml(text)
      setText(yamlText)
      setError('')
      setErrorPosition(null)
      if (textareaRef.current) {
        textareaRef.current.classList.remove('has-error')
      }
    } catch (err) {
      setError('JSON转YAML错误: ' + err.message)
    }
  }

  // 智能转换为JSON（自动检测当前格式）
  const handleConvertToJson = () => {
    try {
      const format = window.services.detectFormat(text)
      let jsonText = text
      
      if (format === 'yaml') {
        jsonText = window.services.yamlToJson(text)
      } else if (format === 'xml') {
        jsonText = window.services.xmlToJson(text)
      } else if (format === 'json') {
        // 如果已经是JSON，只需格式化
        jsonText = window.services.formatJson(text)
      }
      
      setText(jsonText)
      setError('')
      setErrorPosition(null)
      if (textareaRef.current) {
        textareaRef.current.classList.remove('has-error')
      }
    } catch (err) {
      setError('转换为JSON错误: ' + err.message)
    }
  }

  // 智能转换为XML（自动检测当前格式）
  const handleConvertToXml = () => {
    try {
      const format = window.services.detectFormat(text)
      let xmlText = text
      
      if (format === 'json') {
        xmlText = window.services.jsonToXml(text)
      } else if (format === 'yaml') {
        xmlText = window.services.yamlToXml(text)
      } else if (format === 'xml') {
        // 如果已经是XML，只需格式化
        xmlText = window.services.formatXml(text)
      }
      
      setText(xmlText)
      setError('')
      setErrorPosition(null)
      if (textareaRef.current) {
        textareaRef.current.classList.remove('has-error')
      }
    } catch (err) {
      setError('转换为XML错误: ' + err.message)
    }
  }

  // 智能转换为YAML（自动检测当前格式）
  const handleConvertToYaml = () => {
    try {
      const format = window.services.detectFormat(text)
      let yamlText = text
      
      if (format === 'json') {
        yamlText = window.services.jsonToYaml(text)
      } else if (format === 'xml') {
        yamlText = window.services.xmlToYaml(text)
      } else if (format === 'yaml') {
        // 如果已经是YAML，只需格式化
        yamlText = window.services.formatYaml(text)
      }
      
      setText(yamlText)
      setError('')
      setErrorPosition(null)
      if (textareaRef.current) {
        textareaRef.current.classList.remove('has-error')
      }
    } catch (err) {
      setError('转换为YAML错误: ' + err.message)
    }
  }

  const handleCopy = () => {
    if (text) {
      if (window.utools) {
        window.utools.copyText(text)
        window.utools.showNotification('已复制到剪贴板')
      } else {
        navigator.clipboard.writeText(text).then(() => {
          alert('已复制到剪贴板');
        }).catch(err => {
          console.error('复制失败:', err);
        });
      }
    }
  }

  const handleSave = () => {
    if (text) {
      try {
        if (window.services) {
          const filePath = window.services.writeTextFile(text)
          window.utools.shellShowItemInFolder(filePath)
        } else {
          // 提供一个浏览器环境下的替代方案，例如下载文件
          const blob = new Blob([text], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'json_output.json';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        setError('保存文件错误: ' + err.message)
      }
    }
  }

  return (
    <div className="json-convert">
      <div className="json-actions-top">
        <button onClick={handleSmartFormat}>格式化</button>
        <button onClick={handleMinify}>最小化</button>
        <button onClick={handleEscape}>转义</button>
        <button onClick={handleUnescape}>去转义</button>
        <button onClick={handleRemoveComments}>去注释</button>
        <button onClick={handleConvertToYaml}>转YAML</button>
        <button onClick={handleConvertToJson}>转JSON</button>
        <button onClick={handleConvertToXml}>转XML</button>
      </div>
      
      <div className="json-editor">
        <div ref={lineNumbersRef} className="line-numbers">
          {renderLineNumbers()}
        </div>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInputChange}
          spellCheck="false"
        />
      </div>
      {error && <div className="json-error">{error}</div>}
      
      <div className="json-actions-bottom">
        <button onClick={handleCopy}>复制结果</button>
        <button onClick={handleSave}>保存为文件</button>
      </div>
    </div>
  );
}