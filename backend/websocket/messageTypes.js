const MessageTypes = {
  SERVER_CONNECT: 1,
  CLIENT_CONNECT: 2,
  SERVER_CONNECT_RESULT: 3,
  USER_CONNECTED: 4,
};

// Allow lookup by numeric id as well as by constant name
for (const [key, value] of Object.entries(MessageTypes)) {
  MessageTypes[value] = key;
}

export default MessageTypes;
