/**
 * WebSocket Service for Real-time Ride Notifications
 * Handles connection, message subscription, and event broadcasting
 */

import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

class WebSocketService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.subscriptions = {};
    this.listeners = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
  }

  /**
   * Connect to WebSocket server
   */
  connect(onConnect, onError) {
    const socket = new SockJS('http://localhost:8080/ws');
    this.client = Stomp.over(socket);

    this.client.connect(
      {},
      (frame) => {
        console.log('✓ WebSocket Connected:', frame);
        this.isConnected = true;
        this.reconnectAttempts = 0;

        if (onConnect) {
          onConnect();
        }

        // Broadcast connection event to all listeners
        this.emit('connected', { timestamp: new Date() });
      },
      (error) => {
        console.error('✗ WebSocket Connection Error:', error);
        this.isConnected = false;

        if (onError) {
          onError(error);
        }

        this.attemptReconnect();
      }
    );
  }

  /**
   * Attempt to reconnect on failure
   */
  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
      console.log(`⏳ Reconnecting in ${delay}ms... (Attempt ${this.reconnectAttempts})`);

      setTimeout(() => {
        this.connect(null, null);
      }, delay);
    } else {
      console.error('✗ Max reconnection attempts reached');
      this.emit('connection_failed', { attempts: this.maxReconnectAttempts });
    }
  }

  /**
   * Subscribe to driver bookings
   * Topic: /topic/driver/{driverId}/bookings
   */
  subscribeToDriverBookings(driverId, callback) {
    const topic = `/topic/driver/${driverId}/bookings`;
    this.subscribe(topic, callback, 'driver-bookings');
  }

  /**
   * Subscribe to passenger rides
   * Topic: /topic/passenger/{passengerId}/rides
   */
  subscribeToPassengerRides(passengerId, callback) {
    const topic = `/topic/passenger/${passengerId}/rides`;
    this.subscribe(topic, callback, 'passenger-rides');
  }

  /**
   * Subscribe to ride status updates
   * Topic: /topic/rides/{rideId}/status
   */
  subscribeToRideStatus(rideId, callback) {
    const topic = `/topic/rides/${rideId}/status`;
    this.subscribe(topic, callback, `ride-status-${rideId}`);
  }

  /**
   * Subscribe to driver location updates
   * Topic: /topic/passenger/{passengerId}/location
   */
  subscribeToDriverLocation(passengerId, callback) {
    const topic = `/topic/passenger/${passengerId}/location`;
    this.subscribe(topic, callback, `driver-location-${passengerId}`);
  }

  /**
   * Generic subscribe method
   */
  subscribe(topic, callback, subscriptionId) {
    if (!this.isConnected) {
      console.warn('❌ WebSocket not connected. Cannot subscribe to:', topic);
      return;
    }

    if (this.subscriptions[subscriptionId]) {
      console.warn('⚠️ Already subscribed to:', topic);
      return;
    }

    const subscription = this.client.subscribe(topic, (message) => {
      try {
        const payload = JSON.parse(message.body);
        console.log(`📨 Message received on ${topic}:`, payload);
        callback(payload);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    this.subscriptions[subscriptionId] = subscription;
    console.log('✓ Subscribed to:', topic);
  }

  /**
   * Unsubscribe from a topic
   */
  unsubscribe(subscriptionId) {
    if (this.subscriptions[subscriptionId]) {
      this.subscriptions[subscriptionId].unsubscribe();
      delete this.subscriptions[subscriptionId];
      console.log('✓ Unsubscribed from:', subscriptionId);
    }
  }

  /**
   * Unsubscribe from all topics
   */
  unsubscribeAll() {
    Object.keys(this.subscriptions).forEach((key) => {
      this.subscriptions[key].unsubscribe();
    });
    this.subscriptions = {};
    console.log('✓ Unsubscribed from all topics');
  }

  /**
   * Send message to server
   */
  send(destination, message) {
    if (!this.isConnected) {
      console.error('WebSocket not connected. Cannot send message');
      return;
    }

    this.client.send(destination, {}, JSON.stringify(message));
    console.log('✓ Message sent to', destination, message);
  }

  /**
   * Register event listener
   */
  on(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
  }

  /**
   * Emit event
   */
  emit(eventName, data) {
    if (this.listeners[eventName]) {
      this.listeners[eventName].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${eventName} listener:`, error);
        }
      });
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.client && this.isConnected) {
      this.unsubscribeAll();
      this.client.disconnect(() => {
        console.log('✓ WebSocket Disconnected');
        this.isConnected = false;
        this.emit('disconnected', { timestamp: new Date() });
      });
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.isConnected;
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      subscriptionCount: Object.keys(this.subscriptions).length,
      subscriptions: Object.keys(this.subscriptions),
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Export singleton instance
export default new WebSocketService();
