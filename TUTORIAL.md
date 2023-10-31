# Remix Server-Sent Events Workshop

The aim of this tutorial is to explore using Server-Sent events to deliver
real-time updates from the server with Remix. We will build a collaborative Todo
app.

This tutorial will walk you through building this app one piece at a time. Each
major section will have a "snapshot" saved as a new branch in case you get lost
or want to compare where you're at. Each heading will contain a code snippet
that you can use to switch to the respective branch.

If you prefer to work independently or if you don't have `git` installed, or if
you're not comfortable with `git`, that's okay! The instructions assume that
you're working from this repository, but you can easily follow along without
needing to clone this repository.

## Clone this repo

First you'll want to clone this repo. If you're using a terminal application,
you can use this:

```sh
git clone git@github.com:ksmithut/remix-sse-workshop.git
# or the https version
git clone https://github.com/ksmithut/remix-sse-workshop.git
```

Then open up the project in your preferred code editor. You'll need to keep a
terminal open to run various commands for starting the Remix server.

## Start with a template

```sh
git switch main
```

First things first, we've got to start a remix project. We'll start from one of
my templates. It's based on one of the original basic stack templates that was
provided on the Remix website. It's got a few things preconfigured:

- typescript
- tailwindcss
- prettier
- installed `clsx`

If you decide to go with your own starter or template, that's perfectly fine.
You'll be on your own to translate this tutorial to your preferences, but it
shouldn't be too difficult. If you're using JavaScript (and not wanting to go
down the jsdoc route) you can remove all the type annotations and rename all the
`.ts(x)` files to `.js(x)`. If you don't want to use tailwind, you'll be on your
own to do styles the way you see fit, but it shouldn't be too difficult since
we're really only styling one page with just a handful of components.

If you've cloned the repo, you'll want to have a terminal open in the directory
of the project then run the following command and work through the prompts
(you'll want to say yes to installing dependencies):

```sh
cd '{your-project-directory}'
npx create-remix@latest --template ksmithut/remix-templates/ksmithut .
```

If you're not working from a clone of this repository, you can run this command
without the `.` at the end of the command, and work through the prompts:

```sh
npx create-remix@latest --template ksmithut/remix-templates/ksmithut
```

You can start the server with `npm run dev`.

## What is "Server-Sent Events" (SSE)?

"Server-Sent Events" is a protocol for a server to send events to the client. In
most web apps, the most common interaction is for a client to tell the server
new information (create a new Todo item, list all of the todos, etc.). There are
times when the server needs to notify the client of something, such as another
user making changes or notifying the user that a long-running process is
complete.

WebSockets are another solution, but they can be more complex to implement. For
example, if you have important authorization and/or authentication middleware in
your express app, you cannot reuse any of those for websockets. You have to
reimplement your authentication middleware for websockets because your
middleware won't be triggered. The protocol for WebSockets is also fairly
complex with various handshakes you have to perform, as well as protocol and
version matchups. You will almost certainly need to use a library to support
websockets. If you're building a multiplayer game or are sending lots of small
events (such as tracking mouse movements or fast typing) then WebSockets are
probably a better fit. For the occasional update from the server or turn-based
multiplayer game, Server-Sent Events work great.

## Protocol

Server-Sent Events has a very simple protocol. It's over HTTP, so there is no
need to do a handoff or connection upgrade like with WebSockets. The
`Content-Type` of an endpoint supporting Server-Send Events is
`text/event-stream`. It's also a good idea, possibly required, to set the
`Cache-Control` header to `no-cache, no-store` to prevent browsers and proxies
from caching the response. Typically these endpoints are used for new events and
you don't want old events cached anywhere.

The key lies in the structure of the response body. In normal HTTP responses,
you get the headers, then a body, then the response ends. With Server-Sent
Events, you get the body but the response does not end. It maintains the
connection (much like WebSockets). Each 'event' is separated by two newlines,
with each line having a prefix to signify other metadata about the event. Here's
an example Server-Sent Event HTTP response (the first 3 lines are a part of the
response headers):

```
HTTP/2 200
content-type: text/event-stream
cache-control: no-cache, no-store

event: message
id: 71a71f03-c0f2-4282-9f91-5eabe60623e0
retry: 500
data: hello world

event: info
id: a6c6d8a7-671b-4b19-9d67-5b9350d3e73f
data: {"streamUpdated":"2023-10-21T17:22:48.277Z"}

```

You can connect to a Server-Sent Events endpoint using a browser built-in
constructor:

```js
const eventSource = new EventSource('/stream')
eventSource.addEventListener('message', (event) => {
  console.log(event.data)
})
```

If the event source gets disconnected for any reason, it will attempt to
reconnect automatically.

There are a few meaningful line prefixes to describe the event. All of them are
optional:

- `event:` This signifies the type of event. When using the `EventSource` type
  on the front-end, this corresponds with the event you listen to using
  `eventSource.addEventListener(event)`. By default, `message` is used by the
  browser if this line isn't present.
- `id:` Defines an id for the message. When using `EventSource`, if it gets
  disconnected, when it attempts to reconnect, it will send a `Last-Event-ID`
  header with the id of the latest message it received.
- `retry:` Tells the `EventSource` that when attempting to reconnect, it should
  wait the number of milliseconds specified in this field.
- `data:` This is the data you want to send to the event handler. If you want to
  send multiple lines, each line must be prefixed with `data: ` like this:

      data: This is a multiline
      data: message.
      data:
      data: This is another line.

  which will equal the value:

      This is a multiline
      message.

      This is another line.

**Note**: According to the spec, a single space after the `:` will be ignored.

If the line prefix is not one of the above, the line will just be ignored. If
you want to emit a "comment", you can just put a `:` at the beginning of the
line. This can be used to emit a "keep-alive" message that forces any proxies
and clients to process bytes, which can prevent proxie and clients from
unexpectedly closing the connection due to inactivity.

To see this in action (for the duration of this workshop), make a request to
[https://sse.ksmithut.dev](https://sse.ksmithut.dev). You can visit it in your
browser or in any other HTTP client. If you have `curl`, you can use the
following command.

```sh
curl https://sse.ksmithut.dev
```

You'll receive a welcome message, and every 15 seconds or so, you'll also
receive `: ka` (where `ka` stands for keep-alive).

Now to create a new message. You'll need to make a `POST` request to the same
URL with a request body. If you're using `curl`, it could look something like
this:

```sh
curl -X POST https://sse.ksmithut.dev -d 'Hello World'
```

The `Hello World` part of the above command is the request body. That can be
changed to whatever message you would like to send.

Or if you open up a node REPL, you could do something like this:

```js
fetch('https://sse.ksmithut.dev', { method: 'POST', body: 'Hello World' })
```

You could also build a simple HTML page to interact with this endpoint:

```html
<html>
  <body>
    <form id="form">
      <input name="message" required />
    </form>
    <div id="output"></div>

    <script>
      const HOST = 'https://sse.ksmithut.dev'
      const form = document.getElementById('form')
      form.addEventListener('submit', (e) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        const message = data.get('message')
        fetch(HOST, { method: 'POST', body: message })
        e.currentTarget.reset()
      })

      const output = document.getElementById('output')
      const eventSource = new EventSource(HOST)
      eventSource.addEventListener('message', (e) => {
        const message = document.createElement('pre')
        message.innerText = e.data
        output.appendChild(message)
      })
    </script>
  </body>
</html>
```

## How to do this in Remix

```sh
git switch snapshot-01
```

In Remix, you can return your own non-React response by returning (or throwing)
a JavaScript `Response` object. Create a new route file at
`app/routes/todos.ts`:

```ts
import type { LoaderFunctionArgs } from '@remix-run/node'

export async function loader({ request }: LoaderFunctionArgs) {
  return new Response('ok')
}
```

If you have your server running, make an HTTP request to
`http:localhost:3000/todos`. This should produce a response with the content
`ok`.

The `Response` object provides us a way to send a string, but with Server-Sent
Events, we need to send more than just a single string; we need to send a stream
of strings. We could build up a big long string, but it wouldn't send any of it
until we've built the whole string up. In addition to accepting as string in the
`Response` contructor, you can also pass a `ReadableStream`, another web native
object type.

Let's change the `loader` function to build a ReadableStream:

```ts
const encoder = new TextEncoder()

export async function loader({ request }: LoaderFunctionArgs) {
  const stream = new ReadableStream({
    start(controller) {
      let count = 0
      setInterval(() => {
        count++
        console.log({ count })
        const data = count.toString() + '\n'
        const bytes = encoder.encode(data)
        controller.enqueue(bytes)
      }, 1000)
    }
  })
  return new Response(stream)
}
```

The stream we need to pass must be an AsyncIterable of Uint8Arrays. The built-in
way of turning a string into a Uint8Array is using a `TextEncoder`. You can
instantiate one anywhere (top of the file, top of the function). Then to write
data to the stream, you need to enqueue a message. We use `setInterval` to send
the count on the interval.

If you make a request to http://localhost:3000/todos, you should start receiving
an incrementing number on a new line every second. If you're using `curl`, you
can cancel the request with `ctrl` + `c`. You'll notice that in the the server
logs, it's continuing to count. Although we cancelled our request from our HTTP
client, we didn't put anything in our code to handle that cancelled request. The
interval continues to run even after the client isn't listening to the response
anymore.

In order to properly cancel the request, we need to learn about JavaScript's
`AbortController`

## AbortController

```sh
git switch snapshot-02
```

AbortController is a mechanism that allows the caller of an asynchronous process
to abort the asynchronous process midway through processing. It's up to the
designer of the asynchronous process to decide how to handle it, but there are a
few built-in things (like `fetch`) that provide support for this function.

Have you ever seen this error?

```
Can't perform a react state update on an unmounted component
```

Let's look at some React code that could possible cause this error:

```js
const [state, setState] = React.useState({ data: null, error: null })
React.useEffect(() => {
  fetch('/data')
    .then((res) => res.json())
    .then((data) => setState({ error: null, data }))
    .catch((error) => setState((state) => ({ ...state, error })))
}, [])
```

If the component running these hooks gets unmounted before `fetch` call
finishes, the promise will finish and will attempt to setState, which will
result in that error. But how do we cancel a request? We can't take back the
request from the server, but we can cancel our own processing of the request so
we don't have to wait for it to finish. We do that with an `AbortController`.

With `React.useEffect()` we can return a function which will get called when the
dependencies defined in the dependency array (the second argument) change or
when the component gets unmounted. In the `useEffect`, we can initialize an
`AbortController` and call the abort function in that callback. Then in the
promise error handling, we can explicitly look for that abort error and stop
ourselves from updating the state.

To create a new `AbortController`, you use the `new` keyword:

```js
const ac = new AbortController()
```

You can pass the signal to `fetch()` calls like this:

```js
fetch('/data', { signal: ac.signal })
```

and trigger the abort signal with this:

```js
ac.abort()
```

If a `fetch` call gets aborted, you can check for the error by verifying that
`error.name === 'AbortError'`.

It should look like this now:

```js
const [state, setState] = React.useState({ data: null, error: null })
React.useEffect(() => {
  const ac = new AbortController()
  fetch('/data', { signal: ac.signal })
    .then((res) => res.json())
    .then((data) => setState({ error: null, data }))
    .catch((error) => {
      if (error.name === 'AbortError') return
      setState((state) => ({ ...state, error }))
    })
  return () => {
    ac.abort() // This ensures the request is properly canceled
  }
}, [])
```

There are certainly other ways that you can run into that error, but most of
them will stem from an async process that finishes after unmounting. You can fix
most of them using an abort controller or some other method of cancelling that
asynchronous process.

For us in Remix, we're on the "async process" side of things, needing to
implement the cancelling part.

In the loader, we have access to the `request` object. In addition to the url,
headers, and body, we are also given an abort signal. It's an event listener we
can attach to to know when the request is cancelled:

```ts
export async function loader({ request }: LoaderFunctionArgs) {
  const stream = new ReadableStream({
    start(controller) {
      let count = 0
      const interval = setInterval(() => {
        count++
        console.log({ count })
        const data = count.toString() + '\n'
        const bytes = encoder.encode(data)
        controller.enqueue(bytes)
      }, 1000)
      let closed = false
      function close() {
        if (closed) return
        closed = true
        clearInterval(interval)
        request.signal.removeEventListener('abort', close)
        controller.close()
      }
      request.signal.addEventListener('abort', close)
      if (request.signal.aborted) return close()
    }
  })
  return new Response(stream)
}
```

In this rendition, we've added a `close` function that is responsible for
clearing the interval and closing the `ReadableStream`. Then we attach the event
listener for when the event is cancelled. We do need to do an additional check
if it's already cancelled.

Now, let's convert this into a server-sent event endpoint! We've got to change
the string we send the correct format now as well as add the SSE headers:

```ts
export async function loader({ request }: LoaderFunctionArgs) {
  const stream = new ReadableStream({
    start(controller) {
      let count = 0
      const interval = setInterval(() => {
        count++
        console.log({ count })
        const data = `data: ${count}\n\n`
        const bytes = encoder.encode(data)
        controller.enqueue(bytes)
      }, 1000)
      let closed = false
      function close() {
        if (closed) return
        closed = true
        clearInterval(interval)
        request.signal.removeEventListener('abort', close)
        controller.close()
      }
      request.signal.addEventListener('abort', close)
      if (request.signal.aborted) return close()
    }
  })
  const headers = new Headers()
  headers.set('Content-Type', 'text/event-stream')
  headers.set('Cache-Control', 'no-cache, no-store')
  return new Response(stream, { headers })
}
```

## Event Source

```sh
git switch snapshot-03
```

Now that we have some semblance of an event stream, let's try to hook a react
component up to it.

Let's start with a more-or-less empty route component in our
`app/routes/_index.tsx` file:

```tsx
export default function Index() {
  return <h1 className="text-3xl font-bold">Hello World</h1>
}
```

Let's create a hook that will connect up the data to the endpoint. This will use
the browser-native `EventSource` object.

```tsx
import React from 'react'

function useMessages() {
  const [messages, setMessages] = React.useState<string[]>([])
  React.useEffect(() => {
    function handleMessage(event: MessageEvent<string>) {
      const message = event.data
      setMessages((messages) => [...messages, message])
    }
    // Create an EventSource to listen for server-sent events
    const eventSource = new EventSource('/todos')
    // Attach a listener for the 'message' event
    eventSource.addEventListener('message', handleMessage)
    // Return a cleanup function
    return () => {
      // Remove the 'message' event listener
      eventSource.removeEventListener('message', handleMessage)
      // Close the EventSource connection when the component unmounts
      eventSource.close()
    }
  }, [])
  return messages
}

export default function Index() {
  const messages = useMessages()
  return (
    <div>
      {messages.map((message, index) => (
        <p key={message + index}>{message}</p>
      ))}
    </div>
  )
}
```

Now if you go to [localhost:3000](http://localhost:3000) it should start
spouting out all of the counts onto the page.

## Abstracting

```sh
git switch snapshot-04
```

We technically have something working. We're intermingling our business logic
with some of the streaming boilerplate. It would be nice if we could keep our
loader focused on our business logic. Let's maybe come up with what we think an
API could look like for usage in our `app/route/todos.ts` file:

```ts
import type { LoaderFunctionArgs } from '@remix-run/node'
import { createEventStream } from './some/imaginary/library.ts'

export async function loader({ request }: LoaderFunctionArgs) {
  return createEventStream(request.signal, (send) => {
    let count = 0
    const interval = setInterval(() => {
      count++
      send({ data: `${count}` })
    }, 1000)
    return () => {
      clearInterval(interval)
    }
  })
}
```

In this, we are calling `createEventStream` and expecting a `Response` object
that we're hoping will take care of all of the streamy bits. We pass in the
request signal so that we can properly clean up the stream as well as an
initialization function which will be called when the stream begins. That
function will be passed a `send` function which we can use in our code to emit
events. That initialization function will return a cleanup function which will
get called when the request caller terminates the request.

Notice that the `send()` function is taking in an object. In this example, I
also liked the idea of giving it an object with the various SSE fields and
having it format it for us (taking care of all of the multiline data stuff as
well).

Let's create a new folder, `app/lib/` and a new file in that folder
`event-stream.ts`:

```ts
export function createEventStream(signal: AbortSignal, init: Function) {
  // profit???
  return new Response()
}
```

We have the start of our function, but we don't really have a good type defined
for our `init` parameter. Let's start "type"ing that out. It should be an
interface of a function that takes in one parameter, `send`, a function, and it
should return a function that takes no parameters and returns void:

```ts
interface InitCallback {
  (send: Function): () => void
}

export function createEventStream(signal: AbortSignal, init: InitCallback) {
  return new Response()
}
```

Now we need to type the `send` function. We know we want to type out an object
that looks like a Server-Sent Event, then that function will take in an argument
of that type:

```ts
interface ServerSentEvent {
  event?: string
  id?: string
  retry?: number
  data?: string
  comment?: string
}

interface SendFunction {
  (event: ServerSentEvent): void
}

interface InitCallback {
  (send: SendFunction): () => void
}
```

Now we can start implementing the function, copying a lot of pieces of our
previous implementation! We won't call the init function just yet:

```ts
export function createEventStream(signal: AbortSignal, init: InitCallback) {
  const stream = new ReadableStream({
    start(controller) {
      let closed = false
      function close() {
        if (closed) return
        closed = true
        signal.removeEventListener('abort', close)
        controller.close()
      }
      signal.addEventListener('abort', close)
      if (signal.aborted) return close()
    }
  })
  const headers = new Headers()
  headers.set('Content-Type', 'text/event-stream')
  headers.set('Cache-Control', 'no-cache, no-store')
  return new Response(stream, { headers })
}
```

Now might be a good time to change our fake import in `app/routes/todos.ts`:

```diff
-import { createEventStream } from './some/imaginary/library.ts'
+import { createEventStream } from '../lib/event-stream.ts'
```

Before we call the `init` function, we need to create the `send` function. For
that to work, we will probably want a helper function to help us render the
server-sent-event. It's important to remember that all of the sse fields are
optional, and we need to handle there being multiple lines for some of the
fields. It does not matter the order in which the fields are rendered.

```ts
function renderEvent(event: ServerSentEvent) {
  let output = ''
  if (event.event) output += `event: ${event.event}\n`
  return output + '\n'
}
```

One thing to know is that with any of the values we pass in, we shouldn't render
a newline without one of the field prefixes, otherwise we could inadvertently
send an event. So for these single-line fields, we'll create a helper function
to just take the first line:

```ts
function firstLine(value: string) {
  return value.split('\n', 1)[0]
}

function renderEvent(event: ServerSentEvent) {
  let output = ''
  if (event.event) output += `event: ${firstLine(event.event)}\n`
  return output + '\n'
}
```

For the ones that can be multiline, we need to prefix each line with the field
prefix. We'll create another helper function for that:

```ts
function prefixLines(prefix: string, value: string) {
  return value.replace(/^/gm, prefix)
}
```

Regex Magic! Let's break it down. We're replacing all `/^/` with the prefix, but
what does `/^/` mean in this case? the `^` here is saying match the beginning of
the string. By itself, it will only match the very beginning of the string, but
with the flags `g` (global) and `m` (multiline), it will treat each newline as a
new string to match and global to match all, it will replace the beginning of
each line with whatever we pass into the `prefix` variable. This would turn a
string like this:

```
Here is a
multitline string

See that empty space there?
```

into this:

```
data: Here is a
data: multitline string
data:
data: See that empty space there?
```

Now we can fill out the rest of the `renderEvent` function (with some extra
validations for retry):

```ts
function firstLine(value: string) {
  return value.split('\n', 1)[0]
}

function prefixLines(prefix: string, value: string) {
  return value.replace(/^/gm, prefix)
}

function renderEvent(event: ServerSentEvent) {
  let output = ''
  if (event.event) output += `event: ${firstLine(event.event)}\n`
  if (event.id) output += `id: ${firstLine(event.id)}\n`
  if (
    event.retry &&
    Number.isInteger(event.retry) &&
    Number.isFinite(event.retry) &&
    event.retry >= 0
  )
    output += `retry: ${event.retry}\n`
  if (event.data) output += prefixLines('data: ', event.data) + '\n'
  if (event.comment) output += prefixLines(': ', event.comment) + '\n'
  return output + '\n'
}
```

Now we can create our send function and pass it into the init callback. We'll
also want to initialize a `TextEncoder` here as we did in our previous
implementation so we can turn strings into bytes. We'll also want to call the
function that `init` returns in our close function.

```ts
const textEncoder = new TextEncoder()

export function createEventStream(signal: AbortSignal, init: InitCallback) {
  const stream = new ReadableStream({
    start(controller) {
      const cleanup = init((event) => {
        controller.enqueue(textEncoder.encode(renderEvent(event)))
      })
      let closed = false
      function close() {
        if (closed) return
        closed = true
        cleanup()
        signal.removeEventListener('abort', close)
        controller.close()
      }
      signal.addEventListener('abort', close)
      if (signal.aborted) return close()
    }
  })
  const headers = new Headers()
  headers.set('Content-Type', 'text/event-stream')
  headers.set('Cache-Control', 'no-cache, no-store')
  return new Response(stream, { headers })
}
```

We don't need it for this case, but it's not to hard to imagine a way of calling
this event stream and wanting to control when the stream ends. For example, you
may have an event stream that's open for a long time, but you need to check
periodically whether or not they have permission to the stream. Calling it may
look something like this:

```ts
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request)
  return createEventStream(request.signal, (send, close) => {
    const unsubscribe = subscribeToSensitiveData((data) => {
      send({ data })
    })
    const interval = setInterval(() => {
      if (!checkPermissions(user)) close()
    }, 10_000)
    return () => {
      clearInterval(interval)
      unsubscribe()
    }
  })
}
```

For this, we just need to change the type definition for the init callback to
take in the close function and change the call site:

```ts
// ...
interface InitCallback {
  (send: SendFunction, close: () => void): () => void
}
// ...
export function createEventStream(signal: AbortSignal, init: InitCallback) {
  const stream = new ReadableStream({
    start(controller) {
      const cleanup = init((event) => {
        controller.enqueue(textEncoder.encode(renderEvent(event)))
      }, close)
      let closed = false
      function close() {
        if (closed) return
        closed = true
        cleanup()
        signal.removeEventListener('abort', close)
        controller.close()
      }
      signal.addEventListener('abort', close)
      if (signal.aborted) return close()
    }
  })
  const headers = new Headers()
  headers.set('Content-Type', 'text/event-stream')
  headers.set('Cache-Control', 'no-cache, no-store')
  return new Response(stream, { headers })
}
```

This does pose an interesting problem, though. If we pass the `close` function
in, it would be possible for the caller to call the close function before we've
gotten the cleanup function. They could do something like this:

```ts
createEventStream(request.signal, (send, close) => {
  close()
  return () => {}
})
```

That close function would get called, which references the return value of the
function which hasn't returned yet! We could conditionally call the cleanup
function, but if there's something important to clean up, we would miss that. We
need to delay closing in that case with a simple `setTimeout()`:

```ts
const cleanup = init(
  (event) => {
    controller.enqueue(textEncoder.encode(renderEvent(event)))
  },
  // Delay calling the close function to ensure `init` has returned it's cleanup function
  () => setTimeout(close)
)
```

That will delay calling `close` until after `init` returns it's cleanup function
and the rest of our stream initialization finishes.

## Cleanup

There's one more thing we should do in this file. Without "ejecting" and
implementing our own http server to handle serving up remix, we don't have a
great way of cleaning up these long-running requests upon shutdown.

There may be a better way to do this, but this is a fairly simple
implementation. First, we'll have a "global" `Set` of close functions, we'll
append the `close` function for each stream onto this set. We'll also attach an
event handler for `SIGINT` and `SIGTERM`, which will allow us to cleanly close
the requests. `SIGINT` and `SIGTERM` are signals that the calling process can
send to allow our process to exit cleanly. If we don't handle these, it's likely
that network connections will get terminated abruptly, leading to intermittent
errors.

```ts
const closers = new Set<() => void>()
function handleTerminate() {
  closers.forEach((close) => close())
  closers.clear()
}
process.once('SIGINT', handleTerminate)
process.once('SIGTERM', handleTerminate)

export function createEventStream(signal: AbortSignal, init: InitCallback) {
  const stream = new ReadableStream({
    start(controller) {
      const cleanup = init(
        (event) => {
          controller.enqueue(textEncoder.encode(renderEvent(event)))
        },
        () => setTimeout(close)
      )
      let closed = false
      function close() {
        if (closed) return
        closed = true
        cleanup()
        signal.removeEventListener('abort', close)
        closers.delete(close)
        controller.close()
      }
      signal.addEventListener('abort', close)
      closers.add(close)
      if (signal.aborted) return close()
    }
  })
  const headers = new Headers()
  headers.set('Content-Type', 'text/event-stream')
  headers.set('Cache-Control', 'no-cache, no-store')
  return new Response(stream, { headers })
}
```

With that, this file should be done!

## Todos

```sh
git switch snapshot-05
```

Now we're onto building the core of our application. This will be in charge of
the business logic and state keeping of all the todos.

For this exercise, we're just going to have an in-memory store. We're going to
have the ability to add todos, complete and uncomplete todos, and delete todos.

There's a lot of different ways we could (and maybe should) implement this, but
for this, I'm going to use the reducer pattern. For the reducer pattern, we need
to define what the state looks like and what each of the actions look like. In
addition to the four actions we described above, we'll also have an `init`
action for when the front-end first subscribes to our endpoint. Let's create a
new file at `app/todos/todos.reducer.ts`

```ts
export interface Todo {
  id: string
  label: string
  completed: boolean
}

export interface TodosState {
  todos: Todo[]
}

interface Init {
  type: 'init'
  payload: TodosState
}

interface AddTodo {
  type: 'add_todo'
  payload: { id: string; label: string }
}

interface CompleteTodo {
  type: 'complete_todo'
  payload: { id: string }
}

interface UncompleteTodo {
  type: 'uncomplete_todo'
  payload: { id: string }
}

interface DeleteTodo {
  type: 'delete_todo'
  payload: { id: string }
}
```

Now let's combine all those actions into a single type:

```ts
export type TodoAction =
  | Init
  | AddTodo
  | CompleteTodo
  | UncompleteTodo
  | DeleteTodo
```

Now for our reducer. The function signature for a reducer is that the first
argument is the state, the second argument is a union type with all of the
actions, and the reducer always returns the state type. It should be immutable,
which means we won't be making direct module assignments. We'll be utilizing
things like `map` and `filter` as well as the spread operator to make sure we
don't mutate any data coming in.

```ts
export function reducer(state: TodosState, action: TodoAction): TodosState {
  switch (action.type) {
    default:
      return state
  }
}
```

Now we should implement each of the action types.

`Init` - This one is pretty simply. We just return the state provided in the
payload

```ts
switch (action.type) {
  case 'init': {
    return action.payload
  }
  // ...
}
```

`AddTodo` - This one is fairly simple. We take the id and label and create a new
todo out of it.

```ts
switch (action.type) {
  // ...
  case 'add_todo': {
    const { id, label } = action.payload
    return {
      ...state,
      todos: [...state.todos, { id, label, completed: false }]
    }
  }
  // ...
}
```

`CompleteTodo` - This is one where we should use `map` because we will be
changing one of the items in the array.

```ts
switch (action.type) {
  // ...
  case 'complete_todo': {
    const { id } = action.payload
    return {
      ...state,
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: true } : todo
      )
    }
  }
  // ...
}
```

`UncompleteTodo` - This is basically the same as `CompleteTodo`.

```ts
switch (action.type) {
  // ...
  case 'uncomplete_todo': {
    const { id } = action.payload
    return {
      ...state,
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: false } : todo
      )
    }
  }
  // ...
}
```

`DeleteTodo` - This will just use `filter` to remove the todo to delete.

```ts
switch (action.type) {
  // ...
  case 'delete_todo': {
    const { id } = action.payload
    return { ...state, todos: state.todos.filter((todo) => todo.id !== id) }
  }
  // ...
}
```

If we want to add additonal functions later (like a function to delete all
completed todos) we can add that functionality by adding a new action and a new
case statement in our reducer to handle that logic.

## Todos Server

```sh
git switch snapshot-06
```

Now that we have the business logic laid out, now we can build the server
component, which will have the ability to dispatch changes and subscribe to
changes. We'll import our reducer (and some types) and create a function to
create a todos store.

We only want this file to run on the server, so let's put our new file at
`app/todos/todos.server.ts`. We'll have a function to create the store, start
out with an empty state, and export an instance of the store:

```ts
import { reducer, type TodoAction, type TodosState } from './todos.reducer.ts'

function createTodosStore() {
  let state: TodosState = { todos: [] }
  return {}
}

export default createTodosStore()
```

Let's add a getter for getting the current state:

```ts
function createTodosStore() {
  let state: TodosState = { todos: [] }
  return {
    get state() {
      return state
    }
  }
}
```

For the subscribe function, we should add an interface for what a listener looks
like. We'll also need a collection of all the active listeners. When they first
subscribe, we'll call the listener with the `Init` action so the subscriber can
start with the full initial state. The subscribe function will return a function
that will remove the listener from the set of listeners:

```ts
interface Listener {
  (action: TodoAction): void
}

function createTodosStore() {
  let state: TodosState = { todos: [] }
  const listeners = new Set<Listener>()
  return {
    get state() {
      return state
    },
    subscribe(listener: Listener) {
      listeners.add(listener)
      listener({ type: 'init', payload: state })
      return () => {
        listeners.delete(listener)
      }
    }
  }
}
```

For the dispatch function, we'll call the reducer with the existing state and
the ction. If the state didn't change, we won't do anything. If the state did
change, we'll call each of the listeners with the action:

```ts
function createTodosStore() {
  let state: TodosState = { todos: [] }
  const listeners = new Set<Listener>()
  return {
    get state() {
      return state
    },
    subscribe(listener: Listener) {
      listeners.add(listener)
      listener({ type: 'init', payload: state })
      return () => {
        listeners.delete(listener)
      }
    },
    dispatch(action: TodoAction) {
      const nextState = reducer(state, action)
      if (state === nextState) return
      state = nextState
      listeners.forEach((listener) => listener(action))
    }
  }
}
```

The store isn't all that complicated because most of our business logic is in
the reducer. This file is complete!

## Todos Event Stream

```sh
git switch snapshot-07
```

Now to hook it up to our streaming endpoint. Here's what our
`app/routes/todos.ts` looks like right now:

```ts
import type { LoaderFunctionArgs } from '@remix-run/node'
import { createEventStream } from '../lib/event-stream.ts'

export async function loader({ request }: LoaderFunctionArgs) {
  return createEventStream(request.signal, (send) => {
    let count = 0
    const interval = setInterval(() => {
      count++
      send({ data: `${count}` })
    }, 1000)
    return () => {
      clearInterval(interval)
    }
  })
}
```

It should be pretty straightforward to implement. First we need to import our
todos store:

```ts
import todosStore from '../todos/todos.server.ts'
```

Now instead of our interval counting, we'll swap it out for our
`todosStore.subscribe` call, and just send the event data as is:

```ts
export async function loader({ request }: LoaderFunctionArgs) {
  return createEventStream(request.signal, (send) => {
    const unsubscribe = todosStore.subscribe((event) => {
      send({ data: JSON.stringify(event) })
    })
    return () => {
      unsubscribe()
    }
  })
}
```

Some servers, reverse proxies and http clients have an idle timeout where if the
http connection doesn't have any bytes sent after a certain amount of time it
will terminate the connection. If we want the connection to stay up without
forcing the client to reconnect, we could emit an empty event using SSE comments
every 15 seconds or so. Let's put that in there as well:

```ts
export async function loader({ request }: LoaderFunctionArgs) {
  return createEventStream(request.signal, (send) => {
    const unsubscribe = todosStore.subscribe((event) => {
      send({ data: JSON.stringify(event) })
    })
    const keepAlive = setInterval(() => send({ comment: 'ka' }), 15_000)
    return () => {
      clearInterval(keepAlive)
      unsubscribe()
    }
  })
}
```

That was a pretty easy one! But now we've got to hook it all up to the
front-end, which we've barely touched.

## Front-end

```sh
git switch snapshot-08
```

One aspect of Remix that would be good to maintain is to make sure this app will
still work if JavaScript were disabled. For this to work, we'll need to make
sure we use the `loader` function to load the data. Let's add the loader and our
todos state in our `app/routes/_index.tsx` file:

```ts
import type { LoaderFunctionArgs } from '@remix-run/node'
import todosStore from '../todos/todos.server.ts'

export async function loader(params: LoaderFunctionArgs) {
  return { state: todosStore.state }
}
```

Now we can create a hook that can take in our initial loader data and eventually
hook up the `EventSource` to pull in live updates.

```ts
import { useLoaderData } from '@remix-run/react'
// ...
function useTodos() {
  const data = useLoaderData<typeof loader>()
  return data
}
```

Now let's import our reducer. We'll use that which should make our front-end
state management pretty easy:

```ts
import { reducer } from '../todos/todos.reducer.ts'
// ...
function useTodos() {
  const data = useLoaderData<typeof loader>()
  const [state, dispatch] = React.useReducer(reducer, data.state)
  return state
}
```

Next up is connecting up the `EventSource`! We'll do this in a
`React.useEffect()`, create a `handleMssage` function and use that to `dispatch`
the events into our `useReducer` state. We'll also need to clean up our
eventStore:

```ts
function useTodos() {
  const data = useLoaderData<typeof loader>()
  const [state, dispatch] = React.useReducer(reducer, data.state)
  React.useEffect(() => {
    function handleMessage(event: MessageEvent<string>) {
      dispatch(JSON.parse(event.data))
    }
    const eventStore = new EventSource('/todos')
    eventStore.addEventListener('message', handleMessage)
    return () => {
      eventStore.removeEventListener('message', handleMessage)
      eventStore.close()
    }
  }, [])
  return state
}
```

Now we can actually get our todos from the server! Let's pull them into our
Index component:

```tsx
export default function Index() {
  const { todos } = useTodos()
  return (
    <div>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>{todo.label}</li>
        ))}
      </ul>
    </div>
  )
}
```

Nothing is going to show up yet because we don't have a way to add new todos!
Let's work on the form to add a new Todo.

## Add Todo Form

```sh
git switch snapshot-09
```

In Remix, it will be ideal if we can use native forms. This will help us keep
the app functional even if JavaScript is disabled or broken. We'll need to
import the `Form` component from `@remix-run/react`. We'll create an
`AddTodoForm` component just right in this file:

```tsx
import { useLoaderData, Form } from '@remix-run/react'
// ...
function AddTodoForm() {
  return (
    <Form method="POST">
      <input name="label" placeholder="Add Todo..." required />
    </Form>
  )
}
```

Simple enough. Now we should add an action handler to this route file. It should
parse the response body and call the appropriate todosStore dispatch function.
We'll also do a bit of data validation:

```tsx
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node'
// ...

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.formData()
  const label = body.get('label')
  if (typeof label !== 'string') return {}
  const id = crypto.randomUUID()
  todosStore.dispatch({ type: 'add_todo', payload: { id, label } })
  return {}
}
```

Now we can add the `<AddTodoForm />` component to our main route component:

```tsx
export default function Index() {
  const { todos } = useTodos()
  return (
    <div>
      <AddTodoForm />
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>{todo.label}</li>
        ))}
      </ul>
    </div>
  )
}
```

At this point, we should be able to add todos now!

You'll notice that when you submit the form does not clear. If we want it to
clear, we'll need to build in our own reset logic. There may be a more idiomatic
way to do this, but we'll just add a submit handler that will call the built-in
reset function. In this way of doing it, we'll have to use `setTimeout()` in
order to allow remix to get the values off of the form to submit it:

```tsx
function AddTodoForm() {
  const resetForm = React.useCallback((e: React.FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget
    setTimeout(() => form.reset())
  }, [])
  return (
    <Form method="POST" onSubmit={resetForm}>
      <input name="label" placeholder="Add Todo..." required />
    </Form>
  )
}
```

On this page, we are going to end up having a lot of other forms on this page
(for marking a todo completed/uncompleted or deleting). We can only have one
action per route, but we sort of want all of the actions to take place on this
route.

On strategy for doing this is to add a hidden input to each form on the page and
using a `switch` statement in our action handler to take the different actions.
Let's add the hidden input to our form:

```tsx
function AddTodoForm() {
  const resetForm = React.useCallback((e: React.FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget
    setTimeout(() => form.reset())
  }, [])
  return (
    <Form method="POST" onSubmit={resetForm}>
      <input type="hidden" name="action" value="add_todo" />
      <input name="label" placeholder="Add Todo..." required />
    </Form>
  )
}
```

We should now adjust our action handler to put our dispatch and validation code
behind a switch case:

```tsx
export async function action({ request }: ActionFunctionArgs) {
  const body = await request.formData()
  switch (body.get('action')) {
    case 'add_todo': {
      const label = body.get('label')
      if (typeof label !== 'string') break
      const id = crypto.randomUUID()
      todosStore.dispatch({ type: 'add_todo', payload: { id, label } })
      break
    }
  }
  return {}
}
```

## Mark Todo Completed/Uncompleted/Deleted

```sh
git switch snapshot-10
```

For marking a todo completed or uncompleted, we will break out the functionality
into a separate `TodoItem` component. It will take in a single `todo` prop and
utilize a `Form` component for this. The hidden `action` input will need to have
a dynamic value because we will want to send `uncomplete_todo` or
`complete_todo` based on whether or not the given `todo` is completed or not. We
will also utilize `clsx` and `tailwind` to cross out the text when it's
completed.

```tsx
import cx from 'clsx'
import { reducer, type Todo } from '../todos/todos.reducer.ts'
// ...
function TodoItem({ todo }: { todo: Todo }) {
  const updateAction = todo.completed ? 'uncomplete_todo' : 'complete_todo'
  return (
    <Form method="POST">
      <input type="hidden" name="action" value={updateAction} />
      <input type="hidden" name="todo_id" value={todo.id} />
      <button className={cx({ 'line-through': todo.completed })}>
        {todo.label}
      </button>
    </Form>
  )
}
```

We need to add this component to our main component:

```tsx
export default function Index() {
  const { todos } = useTodos()
  return (
    <div>
      <AddTodoForm />
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <TodoItem todo={todo} />
          </li>
        ))}
      </ul>
    </div>
  )
}
```

To hook it up to the back-end, we just need to implement the cases in our action
function:

```tsx
switch (body.get('action')) {
  // ...
  case 'complete_todo': {
    const id = body.get('todo_id')
    if (typeof id !== 'string') break
    todosStore.dispatch({ type: 'complete_todo', payload: { id } })
    break
  }
  case 'uncomplete_todo': {
    const id = body.get('todo_id')
    if (typeof id !== 'string') break
    todosStore.dispatch({ type: 'uncomplete_todo', payload: { id } })
    break
  }
}
```

Deleting will be even easier. It is the same thing without the dynamic action.
We will need to add a wrapping div in our `TodoItem` component to group the two
forms. We'll also add some styles to make sure they are on the same line:

```tsx
function TodoItem({ todo }: { todo: Todo }) {
  const updateAction = todo.completed ? 'uncomplete_todo' : 'complete_todo'
  return (
    <div className="flex">
      <Form method="POST">
        <input type="hidden" name="action" value={updateAction} />
        <input type="hidden" name="todo_id" value={todo.id} />
        <button className={cx({ 'line-through': todo.completed })}>
          {todo.label}
        </button>
      </Form>
      <Form method="POST">
        <input type="hidden" name="action" value="delete_todo" />
        <input type="hidden" name="todo_id" value={todo.id} />
        <button className="text-red-500">✘</button>
      </Form>
    </div>
  )
}
```

And hooking up the back-end for it is pretty similar to the other ones:

```tsx
switch (body.get('action')) {
  // ...
  case 'delete_todo': {
    const id = body.get('todo_id')
    if (typeof id !== 'string') break
    todosStore.dispatch({ type: 'delete_todo', payload: { id } })
    break
  }
}
```

And that is basically all the functionality! It doesn't look great, but improve
it pretty easily.

## Styling

```sh
git switch snapshot-11
```

Let's start off by saying that you are free to style this however you would
like. This tutorial will try and style it fairly minimally.

First thing we want to do is make it mostly centered. For this, we will add a
wrapping div around the `AddTodoForm` and the list of todos. The outer div will
be full screen and center its items. The inner div will have a maximum width and
some padding on the top and bottom.

```tsx
export default function Index() {
  const { todos } = useTodos()
  return (
    <div className="flex h-screen w-screen flex-col items-center overflow-scroll bg-slate-50 text-2xl">
      <div className="w-full max-w-xs gap-3 px-2 py-4">
        <AddTodoForm />
        <ul>
          {todos.map((todo) => (
            <li key={todo.id}>
              <TodoItem todo={todo} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

For the `AddTodoForm` input, I think giving it some padding, drop-shadow and
making it rounded might help it stand out more:

```tsx
function AddTodoForm() {
  const resetForm = React.useCallback((e: React.FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget
    setTimeout(() => form.reset())
  }, [])
  return (
    <Form method="POST" onSubmit={resetForm}>
      <input type="hidden" name="action" value="add_todo" />
      <input
        name="label"
        placeholder="Add Todo..."
        required
        className="w-full rounded-full bg-white px-5 py-2 drop-shadow-md"
      />
    </Form>
  )
}
```

With the extra padding, I think aligning each of the todo items to that same
alignment would make sense. We will also add some more gap between each item.

```tsx
export default function Index() {
  const { todos } = useTodos()
  return (
    <div className="flex h-screen w-screen flex-col items-center overflow-scroll bg-slate-50 text-2xl">
      <div className="w-full max-w-xs gap-3 px-2 py-4">
        <AddTodoForm />
        <ul className="flex flex-col gap-1 px-5 pt-3">
          {todos.map((todo) => (
            <li key={todo.id}>
              <TodoItem todo={todo} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

For the `TodoItem`, I would like to have the delete button be aligned to the
right, but allow for the todo text to go up to it, with a bit of a gap between
them. We will leverage flex `justify-between` with a gap to accomplish this:

```tsx
function TodoItem({ todo }: { todo: Todo }) {
  const updateAction = todo.completed ? 'uncomplete_todo' : 'complete_todo'
  return (
    <div className="flex w-full justify-between gap-3">
      <Form method="POST">
        <input type="hidden" name="action" value={updateAction} />
        <input type="hidden" name="todo_id" value={todo.id} />
        <button className={cx({ 'line-through': todo.completed })}>
          {todo.label}
        </button>
      </Form>
      <Form method="POST">
        <input type="hidden" name="action" value="delete_todo" />
        <input type="hidden" name="todo_id" value={todo.id} />
        <button className="text-red-500">✘</button>
      </Form>
    </div>
  )
}
```

I think making most of the empty space clickable would be nice as well. For todo
items that are really long, we should break up the text. I think that making the
text more of a gray color when the todo is completed will help increase the
contrast between todos that are done and not done.

```tsx
function TodoItem({ todo }: { todo: Todo }) {
  const updateAction = todo.completed ? 'uncomplete_todo' : 'complete_todo'
  return (
    <div className="flex w-full justify-between gap-3">
      <Form method="POST" className="flex-grow">
        <input type="hidden" name="action" value={updateAction} />
        <input type="hidden" name="todo_id" value={todo.id} />
        <button
          className={cx('w-full break-all text-left', {
            'text-gray-400 line-through': todo.completed
          })}
        >
          {todo.label}
        </button>
      </Form>
      <Form method="POST">
        <input type="hidden" name="action" value="delete_todo" />
        <input type="hidden" name="todo_id" value={todo.id} />
        <button className="text-red-500">✘</button>
      </Form>
    </div>
  )
}
```

I think the delete button is a little distracting. It would be nice if it were
only visible if you're hovering over the todo item (or focusing on it with the
keyboard). We can do that by adding a `group` class to the wrapping `div` on the
`TodoItem` component, then using the `group-hover:` modifier on the delete
button.

```tsx
function TodoItem({ todo }: { todo: Todo }) {
  const updateAction = todo.completed ? 'uncomplete_todo' : 'complete_todo'
  return (
    <div className="group flex w-full justify-between gap-3">
      <Form method="POST">
        <input type="hidden" name="action" value={updateAction} />
        <input type="hidden" name="todo_id" value={todo.id} />
        <button
          className={cx('w-full break-all text-left transition-all', {
            'text-gray-400 line-through': todo.completed
          })}
        >
          {todo.label}
        </button>
      </Form>
      <Form method="POST">
        <input type="hidden" name="action" value="delete_todo" />
        <input type="hidden" name="todo_id" value={todo.id} />
        <button className="h-full px-1 text-red-500 opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100">
          ✘
        </button>
      </Form>
    </div>
  )
}
```

Now that you have a completed app, try opening up your app in two different
tabs/browsers (ideally side-by-side so you can see the real-time updates happen
in both tabs).

You should also try disabling JavaScript. You won't be able to see live updates,
but your updates should still work! You'll see updates from other people if you
refresh or take another action. This is one of my favorite things about Remix:
by leveraging the platform using HTML forms, your app will be just as functional
when JavaScript is disabled.

### Bonus: Dark mode

Adding dark mode is pretty straightforward in this simple of an app. On our main
wrapping component, we're going to add `dark:bg-zinc-800 dark:text-white`
classes, and in our `AddTodoForm` component add the `dark:bg-zinc-700` class:

```tsx
export default function Index() {
  const { todos } = useTodos()
  return (
    <div className="flex h-screen w-screen flex-col items-center overflow-scroll bg-slate-50 text-2xl dark:bg-zinc-800 dark:text-white">
      <div className="w-full max-w-xs gap-3 px-2 py-4">
        <AddTodoForm />
        <ul className="flex flex-col gap-1 px-5 pt-3">
          {todos.map((todo) => (
            <li key={todo.id}>
              <TodoItem todo={todo} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function AddTodoForm() {
  const resetForm = React.useCallback((e: React.FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget
    setTimeout(() => form.reset())
  }, [])
  return (
    <Form method="POST" onSubmit={resetForm}>
      <input type="hidden" name="action" value="add_todo" />
      <input
        name="label"
        placeholder="Add Todo..."
        required
        className="w-full rounded-full bg-white px-5 py-2 drop-shadow-md dark:bg-zinc-700"
      />
    </Form>
  )
}
```

## Conclusion

```sh
git switch snapshot-12
```

Hopefully by now you have a good reference implementation for how you can
implement Server-Sent Events in Remix. Server-Sent Events can often be a simpler
alternative to WebSockets, though it might not be a good fit for all real-time
updates. If you're building a turn-based game, SSE should work just fine. If
you're building a fast-based real-time multiplayer game then SSE (and possibly
Remix) aren't the tools you should be reaching for.

When you need to hook up persistent storage, you will have to approach how to
subscribe to updates differently. Each database will have their own API for
delivering events for changes if the database exposes that functionality at all.
You can certainly provide the functionality at the application layer, but you'll
need a delivery mechanism that can span across multiple instances. For example,
you could add code after an update happens to update the subscribers with a new
event. However, if you've scaled your server to more than one instance across
multiple regions, your other instances will not get the update. You need to use
another mechanism to emit those events across instances. In Remix, you could
leverage something like `redis` to distribute those events to all instances of
your app.
