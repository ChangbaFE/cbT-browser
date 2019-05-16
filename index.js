// 唱吧模板引擎 for 浏览器

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  }
  else {
    // Browser globals
    root.cbT = factory();
  }
}(this, function() {

  'use strict';

  const VERSION = '1.1.6';

  const TEMPLATE_OUT = '__templateOut__';
  const TEMPLATE_VAR_NAME = '__templateVarName__';
  const TEMPLATE_SUB = '__templateSub__';
  const TEMPLATE_OBJECT = '__templateObject__';
  const TEMPLATE_NAME = '__templateName__';
  const TEMPLATE_HELPER = '__templateHelper__';
  const SUB_TEMPLATE = '__subTemplate__';
  const FOREACH_INDEX = 'Index';

  // 转义影响正则的字符
  const encodeReg = (source) => String(source).replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1');

  // 辅助函数
  const helpers = {
    // run wrapper
    run(func) {
      func.call(this);
    },

    trim(str) {
      if (str == null) {
        return '';
      }

      if (!String.prototype.trim) {
        return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
      }
      else {
        return String.prototype.trim.call(str);
      }
    },

    // HTML转义
    encodeHTML(source) {
      return String(source)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\\/g, '&#92;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    replaceUrlProtocol(source) {
      return String(source).replace(/^https?:(\/\/.+?)$/i, document.location.protocol + '$1');
    },

    // 转义UI UI变量使用在HTML页面标签onclick等事件函数参数中
    encodeEventHTML(source) {
      return String(source)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\\\\/g, '\\')
        .replace(/\\\//g, '/')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r');
    },

    forEachArray(source, sep = '<br>') {
      const result = [];

      if (this.isArray(source)) {
        for (let i = 0, len = source.length; i < len; i++) {
          const tmp = this.trim(String(source[i]));

          if (tmp !== '') {
            result.push(this.encodeHTML(tmp));
          }
        }
      }

      return result.join(sep);
    },

    // 判断是否是 Object 类型
    isObject(source) {
      return typeof source === 'function' || !!(source && typeof source === 'object');
    },

    // 判断是否是 Array 类型
    isArray(args) {
      if (!Array.isArray) {
        return Object.prototype.toString.call(args) === '[object Array]';
      }
      else {
        return Array.isArray(args);
      }
    },

    isEmptyObject(obj) {
      for (const prop in obj) {
        if (obj.hasOwnProperty(prop)) {
          return false;
        }
      }

      return true;
    },

    each(obj, callback) {
      let length, i = 0;

      if (this.isArray(obj)) {
        length = obj.length;
        for (; i < length; i++) {
          if (callback.call(obj[i], i, obj[i]) === false) {
            break;
          }
        }
      }
      else {
        for (i in obj) {
          if (callback.call(obj[i], i, obj[i]) === false) {
            break;
          }
        }
      }

      return obj;
    }
  };


  const core = {

    // 标记当前版本
    version: VERSION,

    // 自定义分隔符，可以含有正则中的字符，可以是HTML注释开头 <! !>
    leftDelimiter: '<%',
    rightDelimiter: '%>',

    // 自定义默认是否转义，默认为自动转义
    escape: true,

    cache: {},

    // 编译模板
    compile(str) {
      // 检查是否有该id的元素存在，如果有元素则获取元素的innerHTML/value，否则认为字符串为模板
      const element = document.getElementById(str);

      if (element) {
        //取到对应id的dom，缓存其编译后的HTML模板函数
        if (this.cache[str]) {
          return this.cache[str];
        }
        else {
          //textarea或input则取value，其它情况取innerHTML
          const html = /^(textarea|input)$/i.test(element.nodeName) ? element.value : element.innerHTML;

          const func = this._compile(html);

          this.cache[str] = func;

          return func;
        }
      }
      else {
        // 是模板字符串，则生成一个函数
        // 如果直接传入字符串作为模板，则可能变化过多，因此不考虑缓存
        return this._compile(str);
      }
    },

    // 渲染模板函数
    render(str, data, subtemplate) {
      return this.compile(str)(data, subtemplate);
    },

    // 将字符串拼接生成函数，即编译过程(compile)
    _compile(str) {
      return this._buildTemplateFunction(this._parse(str));
    },

    _buildTemplateFunction(str) {
      let funcBody = `
        var ${TEMPLATE_OUT} = '';
        if (${SUB_TEMPLATE}) {
          ${TEMPLATE_OBJECT} = { value: ${TEMPLATE_OBJECT} };
        }
        var ${TEMPLATE_VAR_NAME} = '';
        if (typeof ${TEMPLATE_OBJECT} === 'function' || !!(${TEMPLATE_OBJECT} && typeof ${TEMPLATE_OBJECT} === 'object')) {
          for (var ${TEMPLATE_NAME} in ${TEMPLATE_OBJECT}) {
            ${TEMPLATE_VAR_NAME} += 'var ' + ${TEMPLATE_NAME} + ' = ${TEMPLATE_OBJECT}["' + ${TEMPLATE_NAME} + '"];';
          }
        }
        eval(${TEMPLATE_VAR_NAME});
        ${TEMPLATE_VAR_NAME} = null;
        var cbTemplate = ${TEMPLATE_HELPER};
        var ${TEMPLATE_SUB} = {};
        ${TEMPLATE_OUT} += '${str}';
        return ${TEMPLATE_OUT};
      `;

      // console.log(funcBody.replace(/\\n/g, '\n'));

      // 删除无效指令
      funcBody = funcBody.replace(new RegExp(`${TEMPLATE_OUT}\\s*\\+=\\s*'';`, 'g'), '');

      const func = new Function(TEMPLATE_HELPER, TEMPLATE_OBJECT, SUB_TEMPLATE, funcBody);

      return (templateObject, subTemplate) => func(helpers, templateObject, subTemplate);
    },

    // 解析模板字符串
    _parse(str) {

      //取得分隔符
      const _left_ = this.leftDelimiter;
      const _right_ = this.rightDelimiter;

      //对分隔符进行转义，支持正则中的元字符，可以是HTML注释 <!  !>
      const _left = encodeReg(_left_);
      const _right = encodeReg(_right_);

      str = String(str)

        //去掉分隔符中js注释
        .replace(new RegExp("(" + _left + "[^" + _right + "]*)//.*\n", "g"), "$1")

        //默认支持HTML注释，将HTML注释匹配掉的原因是用户有可能用 <! !>来做分割符
        //.replace(/<!--[\s\S]*?-->/g, '')
        //去掉注释内容  <%* 这里可以任意的注释 *%>
        .replace(new RegExp(_left + '\\*[\\s\\S]*?\\*' + _right, 'gm'), '')

        //用来处理非分隔符内部的内容中含有 斜杠 \ 单引号 ‘ ，处理办法为HTML转义
        .replace(new RegExp(_left + "(?:(?!" + _right + ")[\\s\\S])*" + _right + "|((?:(?!" + _left + ")[\\s\\S])+)", "g"), (item, $1) => {
          let str = '';
          if ($1) {
            //将 斜杠 单引 HTML转义
            str = $1.replace(/\\/g, "&#92;").replace(/'/g, '&#39;');
            while (/<[^<]*?&#39;[^<]*?>/g.test(str)) {
              //将标签内的单引号转义为\r  结合最后一步，替换为\'
              str = str.replace(/(<[^<]*?)&#39;([^<]*?>)/g, '$1\r$2');
            };
          }
          else {
            str = item;
          }

          return str;
        })

        //把所有换行去掉  \r回车符 \t制表符 \n换行符
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        .replace(/\n/g, '\\n');


      str = str
        //定义变量，如果没有分号，需要容错  <%let val='test'%>
        .replace(new RegExp("(" + _left + "\\s*?let\\s*?.+?\\s*?[^;])\\s*?" + _right, "g"),
          `$1;${_right_}`)

        //对变量后面的分号做容错(包括转义模式 如<%:h=value%>)  <%=value;%> 排除掉函数的情况 <%fun1();%> 排除定义变量情况  <%var val='test';%>
        .replace(new RegExp("(" + _left + ":?[hvu]?\\s*?=\\s*?[^;|" + _right + "]*?);\\s*?" + _right, "g"),
          `$1${_right_}`)

        // foreach循环  <% foreach (x in arr) %>
        .replace(new RegExp(_left + "\\s*?foreach\\s*?\\((.+?)\\s+in\\s+(.+?)\\)\\s*?" + _right, "g"),
          `${_left_}if/*-*/(typeof($2)!=='undefined'&&(cbTemplate.isArray($2)&&$2.length>0||cbTemplate.isObject($2)&&!cbTemplate.isEmptyObject($2))){cbTemplate.each($2,($1${FOREACH_INDEX},$1)=>{${_right_}`)

        // foreachelse指令  <% foreachelse %>
        .replace(new RegExp(_left + "\\s*?foreachelse\\s*?" + _right, "g"),
          `${_left_}})}else{cbTemplate.run(()=>{${_right_}`)

        // foreachbreak指令  <% foreachbreak %>
        .replace(new RegExp(_left + "\\s*?foreachbreak\\s*?" + _right, "g"),
          `${_left_}return false;${_right_}`)

        // foreach循环结束  <% /foreach %>
        .replace(new RegExp(_left + "\\s*?/foreach\\s*?" + _right, "g"),
          `${_left_}})}${_right_}`)

        // if 指令 <% if (x == 1) %>
        .replace(new RegExp(_left + "\\s*?if\\s*?\\((.+?)\\)\\s*?" + _right, "g"),
          `${_left_}if($1){${_right_}`)

        // elseif 指令 <% elseif (x == 1) %>
        .replace(new RegExp(_left + "\\s*?else\\s*?if\\s*?\\((.+?)\\)\\s*?" + _right, "g"),
          `${_left_}}else if($1){${_right_}`)

        // else 指令 <% else %>
        .replace(new RegExp(_left + "\\s*?else\\s*?" + _right, "g"),
          `${_left_}}else{${_right_}`)

        // if 指令结束 <% /if %>
        .replace(new RegExp(_left + "\\s*?/if\\s*?" + _right, "g"),
          `${_left_}}${_right_}`)

      // 注意：必须在原生指令编译完毕再编译其他指令

        // 定义子模板 <% define value(param) %>
        .replace(new RegExp(_left + "\\s*?define\\s+?([a-z0-9_$]+?)\\s*?\\((.*?)\\)\\s*?" + _right, "g"),
          `${_left_}${TEMPLATE_SUB}['$1']=($2)=>{${_right_}`)

        // 在最后子模板结束的位置增加直接调用子模板的代码！
        .replace(new RegExp(_left + "\\s*?/define\\s*?(?![\\s\\S]*\\s*?/define\\s*?)" + _right, "g"),
          `${_left_} /define ${_right_}${_left_}if(${SUB_TEMPLATE}){${TEMPLATE_OUT}='';if(${TEMPLATE_SUB}[${SUB_TEMPLATE}]){${TEMPLATE_SUB}[${SUB_TEMPLATE}](value)}${TEMPLATE_VAR_NAME}=null;return}${_right_}`)

        // 定义子模板结束 <% /define %>
        .replace(new RegExp(_left + "\\s*?/define\\s*?" + _right, "g"),
          `${_left_}};${_right_}`)

        // 调用子模板 <% run value() %>
        .replace(new RegExp(_left + "\\s*?run\\s+?([a-zA-Z0-9_$]+?)\\s*?\\((.*?)\\)\\s*?" + _right, "g"),
          `${_left_}if(${TEMPLATE_SUB}['$1']){${TEMPLATE_SUB}['$1']($2)}${_right_}`)


        //按照 <% 分割为一个个数组，再用 \t 和在一起，相当于将 <% 替换为 \t
        //将模板按照<%分为一段一段的，再在每段的结尾加入 \t,即用 \t 将每个模板片段前面分隔开
        .split(_left_).join("\t");

      //支持用户配置默认是否自动转义
      if (this.escape) {
        str = str

          //找到 \t=任意一个字符%> 替换为 ‘，任意字符,'
          //即替换简单变量  \t=data%> 替换为 ',data,'
          //默认HTML转义  也支持HTML转义写法<%:h=value%>
          .replace(new RegExp("\\t=(.*?)" + _right, "g"),
            `'+((typeof($1)==='undefined'||(typeof($1)==='object'&&$1===null))?'':cbTemplate.encodeHTML($1))+'`);
      }
      else {
        str = str

          //默认不转义HTML转义
          .replace(new RegExp("\\t=(.*?)" + _right, "g"),
            `'+((typeof($1)==='undefined'||(typeof($1)==='object'&&$1===null))?'':$1)+'`);
      };

      str = str

        //支持HTML转义写法<%:h=value%>
        .replace(new RegExp("\\t:h=(.*?)" + _right, "g"),
          `'+((typeof($1)==='undefined'||(typeof($1)==='object'&&$1===null))?'':cbTemplate.encodeHTML($1))+'`)

        //支持不转义写法 <%:=value%>和<%-value%>
        .replace(new RegExp("\\t(?::=|-)(.*?)" + _right, "g"),
          `'+((typeof($1)==='undefined'||(typeof($1)==='object'&&$1===null))?'':$1)+'`)

        //支持url转义 <%:u=value%>
        .replace(new RegExp("\\t:u=(.*?)" + _right, "g"),
          `'+((typeof($1)==='undefined'||(typeof($1)==='object'&&$1===null))?'':encodeURIComponent($1))+'`)

        //支持UI 变量使用在HTML页面标签onclick等事件函数参数中  <%:v=value%>
        .replace(new RegExp("\\t:v=(.*?)" + _right, "g"),
          `'+((typeof($1)==='undefined'||(typeof($1)==='object'&&$1===null))?'':cbTemplate.encodeEventHTML($1))+'`)

        //支持迭代数组  <%:a=value|分隔符%>
        .replace(new RegExp("\\t:a=(.+?)(?:\\|(.*?))?" + _right, "g"),
          `'+((typeof($1)==='undefined'||(typeof($1)==='object'&&$1===null))?'':cbTemplate.forEachArray($1,'$2'))+'`)

        //支持格式化钱数  <%:m=value%>
        .replace(new RegExp("\\t:m=(.+?)" + _right, "g"),
          `'+((typeof($1)==='undefined'||(typeof($1)==='object'&&$1===null)||isNaN($1))?'':Number(Math.round(($1)*100)/100).toFixed(2))+'`)

        //字符串截取补... <%:s=value|位数%>
        .replace(new RegExp("\\t:s=(.+?)\\|(\\d+?)" + _right, "g"),
          `'+((typeof($1)==='undefined'||(typeof($1)==='object'&&$1===null))?'':cbTemplate.encodeHTML($1.length>$2?$1.substr(0,$2)+'...':$1))+'`)

        //HTTP协议自适应 <%:p=value%>
        .replace(new RegExp("\\t:p=(.+?)" + _right, "g"),
          `'+((typeof($1)==='undefined'||(typeof($1)==='object'&&$1===null))?'':cbTemplate.encodeHTML(cbTemplate.replaceUrlProtocol($1)))+'`)

        // <%:func=value%>
        .replace(new RegExp("\\t:func=(.*?)" + _right, "g"),
          `'+cbTemplate.encodeHTML($1)+'`)

        // <%:func-value%>
        .replace(new RegExp("\\t:func-(.*?)" + _right, "g"),
          `'+($1)+'`)


        //将字符串按照 \t 分成为数组，在用'); 将其合并，即替换掉结尾的 \t 为 ');
        //在if，for等语句前面加上 '); ，形成 ');if  ');for  的形式
        .split("\t").join("';")

        //将 %> 替换为 _template_out+='
        //即去掉结尾符，生成字符串拼接
        //如：if(list.length=5){%><h2>',list[4],'</h2>');}
        //会被替换为 if(list.length=5){_template_out+='<h2>'+list[4]+'</h2>';}
        .split(_right_).join(`${TEMPLATE_OUT}+='`);

      //console.log(str);

      return str;
    }

  };


  return Object.assign({
    getInstance() {
      return Object.assign({}, core);
    }
  }, core);

}));
