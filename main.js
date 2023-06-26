const express = require("express");
const app = express();
const port = 3000;

var fs = require("fs");
var template = require("./lib/template.js");
var path = require("path");
var sanitizeHtml = require("sanitize-html");
var qs = require("querystring");
var bodyParser = require("body-parser");
var compression = require("compression");

app.use(express.static("public")); // public 폴더 안에서 정적 파일을 찾아서 url을 통해 접근 가능.
app.use(bodyParser.urlencoded({ extended: false })); //미들웨어 표현식. post데이터분석, 콜백호출
app.use(compression());
app.get("*", function (req, res, next) {
  //get방식으로 들오는 모든 경우(*)에 대해 적용함. *대신 주소넣으면 그주소에서만 작동.get *로 하면 post엔 작동 안함
  fs.readdir("./data", function (error, filelist) {
    req.list = filelist;
    next(); // 다음 미들웨어의 실행 여부 결정. 조건문과 next('route')를 써서 다음 route를 실행시킬 수 있음
  });
});
// use를 쓰든, get을 쓰든 다 미들웨어임!
// 미들웨어 안에 미들웨어 만들 수 있음. (next()적용)

app.get("/", (req, res) => {
  var title = "Welcome";
  var description = "Hello, Node.js";
  var list = template.list(req.list);
  var html = template.HTML(
    title,
    list,
    `<h2>${title}</h2>${description}
    <img src="/images/hello.jpg" style="width:400px; display:block; margin-top:10px">`,
    `<a href="/create">create</a>`
  );
  res.send(html);
});

app.get("/page/:pageId", (req, res, next) => {
  var filteredId = path.parse(req.params.pageId).base;
  fs.readFile(`data/${filteredId}`, "utf8", function (err, description) {
    if (err) {
      next(err);  //err를 넣으면 에러를 호출하기로 약속되어있음!
    } else {
      var title = req.params.pageId;
      var sanitizedTitle = sanitizeHtml(title);
      var sanitizedDescription = sanitizeHtml(description, {
        allowedTags: ["h1"],
      });
      var list = template.list(req.list);
      var html = template.HTML(
        sanitizedTitle,
        list,
        `<h2>${sanitizedTitle}</h2>${sanitizedDescription}`,
        ` <a href="/create">create</a>
          <a href="/update/${sanitizedTitle}">update</a>
          <form action="/delete_process" method="post">
            <input type="hidden" name="id" value="${sanitizedTitle}">
            <input type="submit" value="delete">
          </form>`
      );
      res.send(html);
    }
  });
});

app.get("/create", (req, res) => {
  var title = "WEB - create";
  var list = template.list(req.list);
  var html = template.HTML(
    title,
    list,
    `
      <form action="/create_process" method="post">
        <p><input type="text" name="title" placeholder="title"></p>
        <p>
          <textarea name="description" placeholder="description"></textarea>
        </p>
        <p>
          <input type="submit">
        </p>
      </form>
    `,
    ""
  );
  res.send(html);
});

app.post("/create_process", (req, res) => {
  var post = req.body;
  var title = post.title;
  var description = post.description;
  fs.writeFile(`data/${title}`, description, "utf8", function (err) {
    res.redirect(`/page/${title}`);
  });
});

app.get("/update/:pageId", (req, res, next) => {
  var filteredId = path.parse(req.params.pageId).base;
  fs.readFile(`data/${filteredId}`, "utf8", function (err, description) {
    var title = req.params.pageId;
    var list = template.list(req.list);
    var html = template.HTML(
      title,
      list,
      `
        <form action="/update_process" method="post">
          <input type="hidden" name="id" value="${title}">
          <p><input type="text" name="title" placeholder="title" value="${title}"></p>
          <p>
            <textarea name="description" placeholder="description">${description}</textarea>
          </p>
          <p>
            <input type="submit">
          </p>
        </form>
        `,
      `<a href="/create">create</a> <a href="/update/${title}">update</a>`
    );
    res.send(html);
  });
});

app.post("/update_process", (req, res) => {
  var post = req.body;
  var id = post.id;
  var title = post.title;
  var description = post.description;
  fs.rename(`data/${id}`, `data/${title}`, function (error) {
    fs.writeFile(`data/${title}`, description, "utf8", function (err) {
      res.redirect(`/page/${title}`);
    });
  });
});

app.post("/delete_process", (req, res) => {
  var post = req.body;
  var id = post.id;
  var filteredId = path.parse(id).base;
  fs.unlink(`data/${filteredId}`, function (error) {
    res.redirect("/");
  });
});

app.use(function (req, res, next) {
  //middleware는 순차적으로 실행되므로, 맨 마지막에 오류처리함.
  res.status(404).send("Sorry cant find that");
});

app.use(function (err, req, res, next) {  //next(err)을 부르면 이 바로 이함수가 호출됨
  console.error(err.stack)
  res.status(500).send("Something broke");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
