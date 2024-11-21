using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Extensions.Logging;

namespace ChatApp.Hubs
{
    public class ChatHub : Hub
    {
        private static Dictionary<string, string> ConnectedUsers = new Dictionary<string, string>();
        private readonly ILogger<ChatHub> _logger;

        public ChatHub(ILogger<ChatHub> logger)
        {
            _logger = logger;
        }

        public override Task OnConnectedAsync()
        {
            var userName = Context.GetHttpContext().Request.Query["user"];
            if (!string.IsNullOrEmpty(userName))
            {
                ConnectedUsers[userName] = Context.ConnectionId;
                _logger.LogInformation($"User connected: {userName}");
            }
            return base.OnConnectedAsync();
        }

        public override Task OnDisconnectedAsync(Exception exception)
        {
            var userName = ConnectedUsers.FirstOrDefault(x => x.Value == Context.ConnectionId).Key;
            if (userName != null)
            {
                ConnectedUsers.Remove(userName);
                _logger.LogInformation($"User disconnected: {userName}");
            }
            return base.OnDisconnectedAsync(exception);
        }

        public async Task UserTyping(string user)
        {
            _logger.LogInformation($"{user} is typing at {DateTime.Now}");
            await Clients.Others.SendAsync("UserTyping", user);
        }

        public async Task UserStoppedTyping(string user)
        {
            _logger.LogInformation($"{user} stopped typing at {DateTime.Now}");
            await Clients.Others.SendAsync("UserStoppedTyping", user);
        }

        public async Task SendMessage(string user, string message)
        {
            _logger.LogInformation($"Message from {user}: {message}");
            await Clients.All.SendAsync("ReceiveMessage", user, message);
        }
    }
}
