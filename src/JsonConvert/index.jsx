import { useEffect, useState, useRef, useCallback } from 'react'
import './index.css'
import HighlightedText from './HighlightedText.jsx';
import { highlighter } from './highlighter.js';


export default function JsonConvert({ enterAction }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [errorPosition, setErrorPosition] = useState(null)
  // 移除手动高亮状态，改为自动检测
  const [isFormatted, setIsFormatted] = useState(false)
  const [detectedFormat, setDetectedFormat] = useState('json')
  const textareaRef = useRef(null)
  const lineNumbersRef = useRef(null)

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
    if (!text) return null;

    // 根据当前模式选择正确的元素引用
    let targetElement;
    if (isFormatted) {
      // 高亮模式下，尝试获取高亮显示的元素
      targetElement = document.querySelector('.highlighted-content') || 
                     document.querySelector('.highlight-display');
    } else {
      // 编辑模式下，使用textarea引用
      targetElement = textareaRef.current;
    }

    if (!targetElement) {
      // 如果找不到目标元素，使用简单的行号计算
      const lines = text.split('\n');
      return (
        <div className="line-numbers">
          {lines.map((_, index) => (
            <div key={`line-${index}`} className="line-number">
              {index + 1}
            </div>
          ))}
        </div>
      );
    }

    const style = window.getComputedStyle(targetElement);
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5;
    const fontSize = parseFloat(style.fontSize);
    const paddingTop = parseFloat(style.paddingTop);
    const offsetLines = Math.ceil(paddingTop / lineHeight);
    const paddingLeft = parseInt(style.paddingLeft);
    const paddingRight = parseInt(style.paddingRight);
    const textareaWidth = targetElement.clientWidth - paddingLeft - paddingRight;

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
  }, [text, isFormatted]); // 添加 isFormatted 到依赖项

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

    // 添加格式检测逻辑
  useEffect(() => {
    if (text && window.services) {
      try {
        const format = window.services.detectFormat(text)
        setDetectedFormat(format)
      } catch (e) {
        setDetectedFormat('json')
      }
    }
  }, [text])

  // 修改格式化函数，格式化后自动设置为已格式化状态
  const handleSmartFormat = () => {
    try {
      // 使用智能格式化
      const format = window.services.detectFormat(text)
      let formatted
      
      if (format === 'json') {
        formatted = window.services.formatJson(text)
      } else if (format === 'yaml') {
        formatted = window.services.formatYaml(text)
      } else if (format === 'xml') {
        formatted = window.services.formatXml(text)
      } else {
        // 默认尝试JSON格式化
        formatted = smartFormatJson(text)
      }
      
      setText(formatted)
      setIsFormatted(true) // 格式化后启用高亮
      setError('')
      setErrorPosition(null)
      if (textareaRef.current) {
        textareaRef.current.classList.remove('has-error')
      }
    } catch (err) {
      highlightJsonError(text, err)
    }
  }

  // 文本改变时重置格式化状态
  const handleInputChange = (e) => {
    setText(e.target.value)
    setIsFormatted(false) // 手动编辑时取消高亮
    setError('')
    setErrorPosition(null)
    if (textareaRef.current) {
      textareaRef.current.classList.remove('has-error')
    }
  }

  // 修改其他处理函数使用新的服务方法
  const handleMinify = () => {
    try {
      const format = window.services.detectFormat(text)
      
      // 只有JSON格式才支持最小化
      if (format !== 'json') {
        setError('只有JSON格式支持最小化操作')
        return
      }
      
      const minified = JSON.stringify(JSON.parse(text))
      setText(minified)
      setIsFormatted(true) // 最小化后也启用高亮
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
        jsonText = window.services.formatJson(text)
      }
      
      setText(jsonText)
      setIsFormatted(true)  // 确保设置高亮状态
      setDetectedFormat('json')  // 设置检测到的格式
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
        xmlText = window.services.formatXml(text)
      }
      
      setText(xmlText)
      setIsFormatted(true)  // 确保设置高亮状态
      setDetectedFormat('xml')  // 设置检测到的格式
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
        yamlText = window.services.xmlToYaml(text)  // 修复：改为 xmlToYaml
      } else if (format === 'yaml') {
        // 如果已经是YAML，只需格式化
        yamlText = window.services.formatYaml(text)
      }
      
      setText(yamlText)
      setIsFormatted(true)  // 添加：格式化后启用高亮
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
        {/* 移除高亮切换按钮 */}
      </div>
      
      <div className="json-editor">
        <div ref={lineNumbersRef} className="line-numbers">
          {renderLineNumbers()}
        </div>
        {/* 根据是否格式化自动选择显示模式 */}
        {isFormatted ? (
          <div 
            className="highlight-display"
            onDoubleClick={() => setIsFormatted(false)}
            style={{ cursor: 'pointer' }}
            title="双击切换到编辑模式"
          >
            <HighlightedText 
              text={text} 
              format={detectedFormat}
              className="highlighted-content"
            />
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInputChange}
            spellCheck="false"
            placeholder="请输入或粘贴JSON/XML/YAML内容..."
          />
        )}
      </div>
      {error && <div className="json-error">{error}</div>}
      
      <div className="json-actions-bottom">
        <button onClick={handleCopy}>复制结果</button>
        <button onClick={handleSave}>保存为文件</button>
      </div>
    </div>
  );
}