const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load both protos
const USER_PROTO_PATH = path.join(__dirname, './protos/user.proto');
const NOTIFICATION_PROTO_PATH = path.join(__dirname, './protos/notification.proto');

// Mock database
const users = [
    { userId: '1', name: 'John Doe', email: 'john@example.com' },
    { userId: '2', name: 'Jane Smith', email: 'jane@example.com' }
];

// Load both service definitions
const userProtoDefinition = protoLoader.loadSync(USER_PROTO_PATH);
const notificationProtoDefinition = protoLoader.loadSync(NOTIFICATION_PROTO_PATH);

const userProto = grpc.loadPackageDefinition(userProtoDefinition);
const notificationProto = grpc.loadPackageDefinition(notificationProtoDefinition);

// Create notification client
const notificationClient = new notificationProto.notification.NotificationService(
    'localhost:50052',
    grpc.credentials.createInsecure()
);

function listUsers(call, callback) {
    callback(null, { users });
}

function createUser(call, callback) {
    const { name, email } = call.request;
    const userId = (users.length + 1).toString();
    const newUser = { userId, name, email };
    users.push(newUser);

    // Use the notification client
    notificationClient.SendNotification(
        { userId, email, message: 'Welcome! Your account has been created.' },
        (err) => {
            if (err) {
                console.error('Error sending notification:', err);
            }
        }
    );

    callback(null, { success: true, message: 'User created successfully' });
}

function updateUser(call, callback) {
    const { userId, name, email } = call.request;
    const userIndex = users.findIndex(u => u.userId === userId);

    if (userIndex === -1) {
        callback({
            code: grpc.status.NOT_FOUND,
            message: 'User not found'
        });
        return;
    }

    users[userIndex] = { userId, name, email };

    // Use the notification client
    notificationClient.SendNotification(
        { userId, email, message: 'Your profile has been updated' },
        (err) => {
            if (err) {
                console.error('Error sending notification:', err);
            }
        }
    );

    callback(null, { success: true, message: 'User updated successfully' });
}

function deleteUser(call, callback) {
    const { userId } = call.request;
    const userIndex = users.findIndex(u => u.userId === userId);

    if (userIndex === -1) {
        callback({
            code: grpc.status.NOT_FOUND,
            message: 'User not found'
        });
        return;
    }

    users.splice(userIndex, 1);

    // Use the notification client
    notificationClient.SendNotification(
        { userId, email, message: 'Your account has been deleted' },
        (err) => {
            if (err) {
                console.error('Error sending notification:', err);
            }
        }
    );

    callback(null, { success: true, message: 'User deleted successfully' });
}

function getUser(call, callback) {
    const { userId } = call.request;
    const user = users.find(u => u.userId === userId);

    if (!user) {
        callback({
            code: grpc.status.NOT_FOUND,
            message: 'User not found'
        });
        return;
    }

    callback(null, user);
}

function main() {
    const server = new grpc.Server();
    server.addService(userProto.user.UserService.service, {
        ListUsers: listUsers,
        UpdateUser: updateUser,
        CreateUser: createUser,
        DeleteUser: deleteUser,
        GetUser: getUser
    });

    server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
        server.start();
        console.log('User service running on port 50051');
    });
}

main();