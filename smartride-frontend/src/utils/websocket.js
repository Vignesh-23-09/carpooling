import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

class RideWebSocketClient {
    constructor() {
        this.client = null;
        this.subscriptions = new Map(); // Track subscriptions by rideId
    }

    /**
     * Connect to the WebSocket server
     */
    connect(onConnect) {
        const socket = new SockJS('http://localhost:8080/ws');
        this.client = Stomp.over(socket);

        const headers = {};

        this.client.connect(
            headers,
            (frame) => {
                console.log('WebSocket Connected:', frame);
                if (onConnect) {
                    onConnect();
                }
            },
            (error) => {
                console.error('WebSocket Connection Error:', error);
                // Retry connection after 5 seconds
                setTimeout(() => this.connect(onConnect), 5000);
            }
        );
    }

    /**
     * Subscribe to ride status updates for a specific ride
     * @param {Long} rideId - The ID of the ride
     * @param {Function} messageHandler - Callback function to handle messages
     */
    subscribeToRideStatus(rideId, messageHandler) {
        if (!this.client || !this.client.connected) {
            console.error('WebSocket is not connected');
            return;
        }

        const topic = `/topic/ride-status/${rideId}`;

        // Unsubscribe if already subscribed to this ride
        if (this.subscriptions.has(rideId)) {
            this.subscriptions.get(rideId).unsubscribe();
        }

        // Subscribe to the ride status topic
        const subscription = this.client.subscribe(topic, (message) => {
            try {
                const rideStatusMessage = JSON.parse(message.body);
                console.log('Received ride update:', rideStatusMessage);
                messageHandler(rideStatusMessage);
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        });

        // Store subscription for later unsubscribe
        this.subscriptions.set(rideId, subscription);
        console.log(`Subscribed to ride status updates: ${topic}`);
    }

    /**
     * Unsubscribe from ride status updates
     * @param {Long} rideId - The ID of the ride
     */
    unsubscribeFromRideStatus(rideId) {
        if (this.subscriptions.has(rideId)) {
            this.subscriptions.get(rideId).unsubscribe();
            this.subscriptions.delete(rideId);
            console.log(`Unsubscribed from ride #${rideId} status updates`);
        }
    }

    /**
     * Disconnect from the WebSocket server
     */
    disconnect() {
        if (this.client && this.client.connected) {
            // Unsubscribe from all topics
            this.subscriptions.forEach((subscription) => {
                subscription.unsubscribe();
            });
            this.subscriptions.clear();

            this.client.disconnect(() => {
                console.log('WebSocket Disconnected');
            });
        }
    }

    /**
     * Check if WebSocket is connected
     */
    isConnected() {
        return this.client && this.client.connected;
    }
}

// Create singleton instance
const webSocketClient = new RideWebSocketClient();

export default webSocketClient;
