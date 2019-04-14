## lynn-cli Getting started guide

### Install

```
npm install -g lynn-cli
```

### Download an api that you can experiment with

The best way to learn how to use lynn-cli is to download a sample API that it can use. I've provided an API for the excellent JSONPlaceholder service https://jsonplaceholder.typicode.com. To try it out, just clone my repo here:

```
git clone git@github.com:davidahouse/jsonplaceholder-api.git
```

### Run lynn-cli

Now just change directories to the recently cloned `jsonplaceholder-api` and run `lynn-cli`

```
cd jsonplaceholder-api
lynn-cli
```

You should see the lynn-cli banner and the prompt:

```
  _
 | |  _   _   _ __    _ __
 | | | | | | | '_ \  | '_ \
 | | | |_| | | | | | | | | |
 |_|  \__, | |_| |_| |_| |_|
      |___/
0.3.0
lynn-cli>
```

### Help

The cli app has built-in help, so give it a try!

```
lynn-cli> help
  Commands:

    help [command...]                 Provides help for a given command.
    exit                              Exits application.
    project [project]                 Select a project or display current project
    environment [env]                 Add to current environment or display current environment
    reset                             Reset any saved config
    result [key]                      View the contents of the last result
    autoSave [save]                   Turn on/off saving of responses
    query <path>                      Query the last result using jsonpath syntax
    set <variable> <value>            Set a value in the current environment
    generate                          Generate the docs for this project
    schema [options]                  Generate the list of paths found in the result data json
    matrix <request> <xaxis> <yaxis>  Execute a series of requests with a combination of environment files
    config                            Show the current config
    requests                          List all the requests available
    request <name>                    Execute a request inside an OpenAPI spec
lynn-cli>
```

### To see the list of requests this api can make, just use the `requests` command:

```
lynn-cli> requests
albums - Get the list of albums
comments - Get the list of comments
photos - Get the list of photos
posts - Get the list of posts
todos - Get the list of todos
users - Get the list of users
```

### Request file format

The requests are all based on the OpenAPI spec: https://github.com/OAI/OpenAPI-Specification. Currently lynn-cli supports only the basic functionality in the OpenAPI spec, but more will be added. The goal is to have a fully functional command line alternative to Swagger UI and other web based tools.

`lynn-cli` looks in a sub-folder named `/requests` to find any .yaml, .yml or .json files that might contain requests. When launched, `lynn-cli` scans these files and builds a list of possible requests from the various `path` and `operationId` combinations found in the request file. For the JSONPlaceholder API, there are separate files for each type of data that the service supports. You can put a single request, or many requests in a single request file. Also you can name the file anything you like as long as it ends in either `.yml`, `.yaml` or `.json`.

### Making a request!

Making a request is simple, just use the `request` command:

```
lynn-cli> request posts
✔ --> posts posts [200] 307.92865ms
lynn-cli>
```

The result will display the http status code along with the response time.

### Looking at the response

Getting further details about the request & response can be found using the `result` command:

```
lynn-cli> result
options:
{"protocol":"https:","host":"jsonplaceholder.typicode.com","port":"443","method":"GET","path":"/posts?","headers":{},"auth":null,"timeout":30000}
statusCode:
200
headers:
{"date":"Sun, 14 Apr 2019 17:45:40 GMT","content-type":"application/json; charset=utf-8","transfer-encoding":"chunked","connection":"close","set-cookie":["__cfduid=d46dc60424e6fb01d2d4d6318f9e2ab181555263940; expires=Mon, 13-Apr-20 17:45:40 GMT; path=/; domain=.typicode.com; HttpOnly"],"x-powered-by":"Express","vary":"Origin, Accept-Encoding","access-control-allow-credentials":"true","cache-control":"public, max-age=14400","pragma":"no-cache","expires":"Sun, 14 Apr 2019 21:45:40 GMT","x-content-type-options":"nosniff","etag":"W/\"6b80-Ybsq/K6GwwqrYkAsFxqDXGC7DoM\"","via":"1.1 vegur","cf-cache-status":"HIT","expect-ct":"max-age=604800, report-uri=\"https://report-uri.cloudflare.com/cdn-cgi/beacon/expect-ct\"","server":"cloudflare","cf-ray":"4c777eabdbd9cf6a-IAD"}
body:
[{"userId":1,"id":1,"title":"sunt aut facere repellat provident occaecati excepturi optio reprehenderit","body":"quia et suscipit\nsuscipit recusandae consequuntur expedita et cum\nreprehenderit molestiae ut ut quas totam\nnostrum rerum est autem sunt rem eveniet architecto"},{"userId":1,"id":2,"title":"qui est esse","body":"est rerum tempore vitae\nsequi sint nihil reprehenderit dolor beatae ea dolores neque\nfugiat blanditiis voluptate porro vel nihil molestiae ut reiciendis\nqui aperiam non debitis possimus qui neque nisi nulla"},{"userId":1,"id":3,"title":"ea molestias quasi exercitationem repellat qui ipsa sit aut","body":"et iusto sed quo iure\nvoluptatem occaecati omnis eligendi aut ad\nvoluptatem doloribus vel accusantium quis pariatur\nmolestiae porro eius odio et labore et velit aut"},{"userId":1,"id":4,"title":"eum et est occaecati","body":"ullam et saepe reiciendis voluptatem
...
t a modi nesciunt soluta\nipsa voluptas error itaque dicta in\nautem qui minus magnam et distinctio eum\naccusamus ratione error aut"}]
error:
null
responseTime:
307.92865
```

The result is a json object with the following top level values:

- options (the details used to make the request)
- statusCode (the http status code of the response)
- headers (the list of headers returned in the response)
- body (the full body of the response)
- error (the error if not a http error)
- responseTime (the response time)

You can get just part of the result by specifying one of the above top level values:

```
lynn-cli> result headers
{"date":"Sun, 14 Apr 2019 17:45:40 GMT","content-type":"application/json; charset=utf-8","transfer-encoding":"chunked","connection":"close","set-cookie":["__cfduid=d46dc60424e6fb01d2d4d6318f9e2ab181555263940; expires=Mon, 13-Apr-20 17:45:40 GMT; path=/; domain=.typicode.com; HttpOnly"],"x-powered-by":"Express","vary":"Origin, Accept-Encoding","access-control-allow-credentials":"true","cache-control":"public, max-age=14400","pragma":"no-cache","expires":"Sun, 14 Apr 2019 21:45:40 GMT","x-content-type-options":"nosniff","etag":"W/\"6b80-Ybsq/K6GwwqrYkAsFxqDXGC7DoM\"","via":"1.1 vegur","cf-cache-status":"HIT","expect-ct":"max-age=604800, report-uri=\"https://report-uri.cloudflare.com/cdn-cgi/beacon/expect-ct\"","server":"cloudflare","cf-ray":"4c777eabdbd9cf6a-IAD"}
lynn-cli>
```

### Environment

If you look at the `posts.yml` file you will see there is no information there on the host or protocol used to make the request. This information in the API is actually defined in the environment. Similar to how the shell environment works, `lynn-cli` has its own environment where you can store key/value pairs. In the example project there is a `default.json` file that contains the environment values for HOST, PORT and PROTOCOL. These are used by the request to fill in the missing details from the request spec file. Also note the `default.json` is loaded automatically because we have a `.lynnrc` file in the root of the API folder and it contains an initial value for the `environment` command line parameter. You could also specify an initial environment using a parameter on the initial invocation of `lynn-cli`: `lynn-cli --environment default.json`.

You can see what is in the environment by using the `environment` command:

```
lynn-cli> environment
HOST: jsonplaceholder.typicode.com
PORT: 443
PROTOCOL: https:
lynn-cli>
```

And you can set values in the environment with the `set` command:

```
lynn-cli> set ANSWER 42
lynn-cli> environment
HOST: jsonplaceholder.typicode.com
PORT: 443
PROTOCOL: https:
ANSWER: 42
lynn-cli>
```

To erase all the environment values, use `reset`:

```
lynn-cli> reset

lynn-cli> environment
lynn-cli>
```

And you can load an environment from a `json` file in the `/environment` subfolder also using the `environment` command:

```
lynn-cli> environment default.json
lynn-cli> environment
HOST: jsonplaceholder.typicode.com
PORT: 443
PROTOCOL: https:
lynn-cli>
```

### Digging deeper into the result

You can get a schema of the result body using the `schema` command:

```
lynn-cli> request posts
✔ --> posts posts [200] 196.231325ms
lynn-cli> schema
/0
/1
/2
/3
/4
/5
/6
/7
/8
/9
/10
...
/98/id
/98/title
/98/body
/99/userId
/99/id
/99/title
/99/body
```

This gives you a quick way to find all the json paths in the result. Which leads to different ways you can query for values. First off, you can just query for a single path directly:

```
lynn-cli> query /99/title
"at nam consequatur ea labore ea harum"
lynn-cli>
```

Note this method works directly on the result body, but if you use the `$` character to start the path you can look into the full response object:

```
lynn-cli> query query $/response/headers/cache-control
"public, max-age=14400"
lynn-cli>
```

If you want multiple results you can perform a JSON path query by using the `?` character and then the JSON path query string:

```
lynn-cli> query ?..id
[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100]
lynn-cli>
```

To find out more about the JSON path query syntax, checkout the node.js module: https://www.npmjs.com/package/jsonpath. Just note that `lynn-cli` uses the `?` character instead of `$` since the `$` character represents a single element using the JSON pointer syntax.

### Saving results

To save results to a file, just use the `autoSave` command:

```
lynn-cli> autoSave true
lynn-cli> request posts
✔ --> posts posts [200] 205.856941ms
lynn-cli>
```

The full request will then be saved in a `/log` folder in your current directory.
