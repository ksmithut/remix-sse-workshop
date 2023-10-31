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
