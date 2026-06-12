import SockJS from 'sockjs-client'
import Stomp from 'stompjs'

class WebSocketService {
  constructor() {
    this.client = null
    this.subscriptions = new Map()
  }

  connect(onConnect, onError) {
    if (this.client?.connected) {
      onConnect?.()
      return
    }

    const socket = new SockJS('http://localhost:8080/ws')
    this.client = Stomp.over(socket)

    this.client.connect(
      {},
      () => onConnect?.(),
      (error) => {
        onError?.(error)
        setTimeout(() => this.connect(onConnect, onError), 5000)
      }
    )
  }

  subscribeToDriverBookings(driverId, messageHandler) {
    if (!this.client?.connected) return

    const topic = `/topic/driver-bookings/${driverId}`
    const subKey = `driver-${driverId}`

    if (this.subscriptions.has(subKey)) {
      this.subscriptions.get(subKey).unsubscribe()
    }

    const subscription = this.client.subscribe(topic, (message) => {
      try {
        messageHandler(JSON.parse(message.body))
      } catch {
        messageHandler({ message: message.body })
      }
    })

    this.subscriptions.set(subKey, subscription)
  }

  subscribeToNotifications(userId, messageHandler) {
    if (!this.client?.connected) return

    const topic = `/topic/notifications/${userId}`
    const subKey = `notifications-${userId}`

    if (this.subscriptions.has(subKey)) {
      this.subscriptions.get(subKey).unsubscribe()
    }

    const subscription = this.client.subscribe(topic, (message) => {
      try {
        const notification = JSON.parse(message.body)
        console.log('[WebSocket] Received notification:', notification)
        messageHandler(notification)
      } catch (error) {
        console.error('[WebSocket] Error parsing notification:', error)
      }
    })

    this.subscriptions.set(subKey, subscription)
  }

  subscribeToUnreadCount(userId, messageHandler) {
    if (!this.client?.connected) return

    const topic = `/topic/notifications/${userId}/unread-count`
    const subKey = `unread-count-${userId}`

    if (this.subscriptions.has(subKey)) {
      this.subscriptions.get(subKey).unsubscribe()
    }

    const subscription = this.client.subscribe(topic, (message) => {
      try {
        const count = JSON.parse(message.body)
        console.log('[WebSocket] Received unread count:', count)
        messageHandler(count)
      } catch (error) {
        console.error('[WebSocket] Error parsing unread count:', error)
      }
    })

    this.subscriptions.set(subKey, subscription)
  }

  disconnect() {
    if (!this.client?.connected) return

    this.subscriptions.forEach((sub) => sub.unsubscribe())
    this.subscriptions.clear()
    this.client.disconnect(() => {})
  }
}

export default new WebSocketService()
