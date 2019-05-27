# cbT.js for browser

[![npm version](https://badgen.net/npm/v/cb-template-browser)](https://www.npmjs.com/package/cb-template-browser)

一个浏览器端模板引擎

## 安装

```bash
$ npm install cb-template-browser
```

## 实例

```html
<% if (user) %>
  <p><%=user.name%></p>
<% /if %>
```

## 使用

```javascript
const cbT = require('cb-template-browser');

const template = cbT.compile(str);
template(data);
// => 已渲染的 HTML 字符串

cbT.render(str, data);
// => 已渲染的 HTML 字符串
```

## 选项

### cbT.leftDelimiter

定义左分隔符，默认值：`<%`

### cbT.rightDelimiter

定义右分隔符，默认值：`%>`

## API

### cbT.compile(str)

编译模板字符串，返回模板函数。

参数：

* str: 字符串，输入的模板内容或者是 DOM 节点实例或者是 DOM 节点的 id 属性值

返回值：

类型：函数，模板函数，用于后续直接渲染模板。

模板函数参数：

* data: 对象，输入的数据

例子：

```javascript
const template = cbT.compile(`<title><%=title%></title><p><%=nickname%></p>`);
template({ title: '标题', nickname: '昵称' });
// => 已渲染的 HTML 字符串
```

```html
<script type="text/html" id="template-demo">
  <h1><%=title%></h1>
  <p><%=nickname%></p>
</script>
```

```javascript
const template = cbT.compile('template-demo');
template({ title: '标题', nickname: '昵称' });
// => 已渲染的 HTML 字符串
```

```javascript
const template = cbT.compile(document.getElementById('template-demo'));
template({ title: '标题', nickname: '昵称' });
// => 已渲染的 HTML 字符串
```

### cbT.render(str, data)

编译模板字符串，并返回渲染后的结果。

参数：

* str: 字符串，输入的模板内容或者是 DOM 节点实例或者是 DOM 节点的 id 属性值
* data: 对象，用于渲染的数据，对象的 key 会自动转换为模板中的变量名

返回值：

类型：字符串，已渲染的字符串

例子：

```javascript
cbT.render(`<title><%=title%></title><p><%=nickname%></p>`, { title: '标题', nickname: '昵称' });
// => 已渲染的 HTML 字符串
```

### cbT.getInstance()

获取模板引擎的一个新实例，一般用于单独设置模板引擎的某个选项，比如单独设置左右分隔符。

例子：

```javascript
const myInstance = cbT.getInstance();
myInstance.render(`<title><%=title%></title><p><%=nickname%></p>`, { title: '标题', nickname: '昵称' });
// => 已渲染的 HTML 字符串
```

注意：获取的新实例不能进行 getInstance() 操作，只能从 cbT 中 getInstance()

## 模板语法

模板默认分隔符为 `<% %>`，例如：`<% if (条件表达式) %>内容<% /if %>`

### 转义后输出变量内容

进行 HTML 转义后输出变量内容，可确保没有 XSS 安全问题。

基本用法：`<%=变量%>`

例子：

```html
<title><%=title%></title>
<p><%=nickname%></p>
```

### 不转义输出变量内容

原样输出变量内容，除非你知道自己在做什么，否则不要使用，会有 XSS 安全问题。

基本用法：`<%:=变量%>` 或 `<%-变量%>`

例子：

```html
<title><%:=title%></title>
<p><%-nickname%></p>
```

### URL 转义输出变量内容

对变量做 URL 转义，一般用于 URL 传参中。

基本用法：`<%:u=变量%>`

例子：

```html
<a href="https://domain.com/index?title=<%:u=title%>&nickname=<%:u=nickname%>">链接</a>
```

### 转义 HTML 属性值后输出变量内容

进行 HTML 属性值的转义输出，一般用于 HTML 属性值的安全输出。

基本用法：`<%:v=变量%>`

例子：

```html
<div data-title="<%:v=title%>" data-nickname="<%:v=nickname%>">内容</div>
```

### 转义输出数组

迭代数组并做 HTML 转义输出。

基本用法：`<%:a=数组变量 | 分隔符%>`

分隔符可不写，默认值为 `<br>`

例子：

```html
<div><%:a=listing%></div> <!-- 输出 <div>元素0<br>元素1<br>元素2<div> -->
<div><%:a=listing | ,%></div> <!-- 输出 <div>元素0,元素1,元素2<div> -->
```

### 格式化钱数

四舍五入保留两位小数输出变量内容。

基本用法：`<%:m=变量%>`

例子：

```html
<div><%:m=money%></div>
```

### 内容截取

截取内容后输出变量，如果被截断自动在末尾添加 `...`，否则不添加。

基本用法：`<%:s=变量 | 保留字数%>`

例子：

```html
<div><%:s=title | 10%></div>
```

### URL 协议自适应

把 URL 处理成协议自适应格式，类似 `//domian.com/index`。

基本用法：`<%:p=变量%>`

例子：

```html
<img src="<%:p=avatar%>" alt="头像">
```

### 转义输出函数返回值

用于转义输出函数返回值。

基本用法：`<%:func=函数%>`

例子：

```html
<p><%:func=getData()%></p>
```

### 不转义输出函数返回值

不转义输出函数返回值，慎用。

基本用法：`<%:func-函数%>`

例子：

```html
<p><%:func-getData()%></p>
```

### 定义变量

用于在模板作用域中定义变量。

基本用法：`<% let 变量名 = 变量值 %>`

例子：

```html
<% let myData = '123' %>
<p><%=myData%></p>
```

### 遍历数组

一般用于循环输出数组内容。

基本用法：

* `<% foreach (循环变量 in 数组变量) %>循环体<% /foreach %>`
* `<% foreach (循环变量 in 数组变量) %>循环体<% foreachelse %>数组为空时的内容<% /foreach %>`

如果需要获取数组下标，可以使用 `循环变量Index` 的形式获取。

例子：

```html
<ul>
  <% foreach (item in listing) %>
  <li><%=itemIndex%>: <%=item.nickname%></li>
  <% foreachelse %>
  <li>暂无内容</li>
  <% /foreach %>
</ul>
```

### 条件输出

用于根据不同条件输出不同内容

基本用法：

* `<% if (标准 js 条件表达式) %>条件为真时输出<% else %>条件为假时输出<% /if %>`
* `<% if (标准 js 条件表达式) %>本条件为真时输出<% elseif (标准 js 条件表达式) %>本条件为真时输出<% else %>条件都不符合时输出<% /if %>`

例子：

```html
<div>
  <% if (nickname === 'name1') %>
    <p>这是 name1</p>
  <% elseif (nickname === 'name2') %>
   <p>这是 name2</p>
  <% elseif (nickname === 'name3') %>
    <p>这是 name3</p>
  <% else %>
    <p>都不是</p>
  <% /if %>
</div>
```

### 定义子模板

一般用于定义一个公共的模板部分，以方便重复使用

基本用法：`<% define 子模板名称(参数) %>子模板内容<% /define %>`

其中 `参数` 为合法变量名，用于在子模板中接收外部参数

例子：

```html
<% define mySubTemplate(params) %>
 <p><%=params.nickname%></p>
 <p><%=params.title%></p>
<% /define %>
```

### 调用子模板

调用已经定义的子模板

基本用法：`<% run 子模板名称(参数对象) %>`

例子：

```html
<% run mySubTemplate({ nickname: '昵称', title: '标题' }) %>
```
