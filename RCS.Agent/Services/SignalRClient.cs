using Microsoft.AspNetCore.SignalR.Client;
using RCS.Common.Models;
using RCS.Common.Protocols;
using System;
using System.Threading.Tasks;

namespace RCS.Agent.Services
{
    public class SignalRClient
    {
        private HubConnection _connection;
        private string _serverUrl;
        
        public event Func<CommandMessage, Task> OnCommandReceived;

        public SignalRClient(string serverUrl)
        {
            _serverUrl = serverUrl;
            _connection = new HubConnectionBuilder()
                .WithUrl(_serverUrl)
                .WithAutomaticReconnect()
                .Build();

            _connection.On<CommandMessage>(ProtocolConstants.ReceiveCommand, async (cmd) =>
            {
                if (OnCommandReceived != null)
                {
                    await OnCommandReceived.Invoke(cmd);
                }
            });
        }

        public async Task ConnectAsync(string agentId)
        {
            try
            {
                await _connection.StartAsync();
                Console.WriteLine($"[SignalR] Connected to {_serverUrl}");
                await _connection.InvokeAsync(ProtocolConstants.RegisterAgent, agentId);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SignalR] Connection Failed: {ex.Message}");
            }
        }

        public async Task SendResponseAsync(ResponseMessage response)
        {
            if (_connection.State == HubConnectionState.Connected)
                await _connection.InvokeAsync(ProtocolConstants.SendResponse, response);
        }

        public async Task SendUpdateAsync(RealtimeUpdate update)
        {
            if (_connection.State == HubConnectionState.Connected)
                await _connection.InvokeAsync(ProtocolConstants.SendUpdate, update);
        }

        public async Task SendBinaryAsync(string base64Data)
        {
            if (_connection.State == HubConnectionState.Connected)
                await _connection.InvokeAsync(ProtocolConstants.SendBinaryStream, base64Data);
        }
    }
}