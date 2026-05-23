import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../providers/conversations_provider.dart';
import '../../models/conversation.dart';

class ChatDetailScreen extends StatefulWidget {
  final Conversation conversation;

  const ChatDetailScreen({super.key, required this.conversation});

  @override
  State<ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends State<ChatDetailScreen> {
  final _messageCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    final provider = context.read<ConversationsProvider>();
    Future.microtask(() => provider.fetchMessages(widget.conversation.id));
  }

  @override
  void dispose() {
    _messageCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (_scrollCtrl.hasClients) {
      Future.delayed(const Duration(milliseconds: 100), () {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      });
    }
  }

  Future<void> _sendReply() async {
    final text = _messageCtrl.text.trim();
    if (text.isEmpty) return;

    setState(() => _sending = true);
    _messageCtrl.clear();

    final provider = context.read<ConversationsProvider>();
    await provider.sendReply(widget.conversation.id, text);

    setState(() => _sending = false);
    _scrollToBottom();
  }

  Future<void> _toggleMode() async {
    final c = widget.conversation;
    final newMode = c.mode == 'ai' ? 'human' : 'ai';
    await context
        .read<ConversationsProvider>()
        .toggleMode(c.id, newMode);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Switched to ${newMode == "ai" ? "AI" : "Human"} mode'),
          backgroundColor: AppColors.emerald,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ConversationsProvider>();
    final messages = provider.messages;
    final c = widget.conversation;

    if (messages.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
    }

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.emeraldPale,
              child: Text(
                c.customerName.isNotEmpty
                    ? c.customerName[0].toUpperCase()
                    : '?',
                style: const TextStyle(
                    color: AppColors.emeraldDark,
                    fontWeight: FontWeight.w700,
                    fontSize: 14),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(c.customerName,
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w600)),
                  Text(
                    c.mode == 'ai' ? 'AI handling' : 'Manual mode',
                    style: TextStyle(fontSize: 11, color: AppColors.slate400),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          // Mode toggle
          IconButton(
            icon: Icon(
              c.mode == 'ai' ? Icons.smart_toy : Icons.person,
              color: c.mode == 'ai' ? AppColors.emerald : AppColors.gold,
            ),
            tooltip: c.mode == 'ai' ? 'Switch to Human' : 'Switch to AI',
            onPressed: _toggleMode,
          ),
          // Archive
          PopupMenuButton<String>(
            onSelected: (v) async {
              if (v == 'archive') {
                await provider.archiveConversation(c.id);
                if (!context.mounted) return;
                Navigator.pop(context);
              }
            },
            itemBuilder: (_) => [
              const PopupMenuItem(
                  value: 'archive', child: Text('Archive Conversation')),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Messages ──
          Expanded(
            child: provider.loadingMessages
                ? const Center(
                    child:
                        CircularProgressIndicator(color: AppColors.emerald))
                : messages.isEmpty
                    ? Center(
                        child: Text('No messages',
                            style: TextStyle(color: AppColors.slate400)))
                    : ListView.builder(
                        controller: _scrollCtrl,
                        padding: const EdgeInsets.all(16),
                        itemCount: messages.length,
                        itemBuilder: (context, index) {
                          final msg = messages[index];
                          final isMe = msg.isOutbound;

                          return Align(
                            alignment: isMe
                                ? Alignment.centerRight
                                : Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 10),
                              constraints: BoxConstraints(
                                maxWidth:
                                    MediaQuery.of(context).size.width * 0.75,
                              ),
                              decoration: BoxDecoration(
                                color:
                                    isMe ? AppColors.emerald : AppColors.white,
                                borderRadius: BorderRadius.only(
                                  topLeft: const Radius.circular(16),
                                  topRight: const Radius.circular(16),
                                  bottomLeft: Radius.circular(isMe ? 16 : 4),
                                  bottomRight: Radius.circular(isMe ? 4 : 16),
                                ),
                                border: isMe
                                    ? null
                                    : Border.all(color: AppColors.slate200),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    msg.content,
                                    style: TextStyle(
                                      color:
                                          isMe ? Colors.white : AppColors.slateDark,
                                      fontSize: 14,
                                    ),
                                  ),
                                  if (msg.responseSource != null) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      msg.responseSource!,
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: isMe
                                            ? Colors.white70
                                            : AppColors.slate400,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),

          // ── Input bar ──
          Container(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            decoration: BoxDecoration(
              color: AppColors.white,
              border: Border(top: BorderSide(color: AppColors.slate200)),
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageCtrl,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _sendReply(),
                      decoration: InputDecoration(
                        hintText: 'Type a reply...',
                        hintStyle: TextStyle(color: AppColors.slate400),
                        filled: true,
                        fillColor: AppColors.slate100,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 10),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.emerald,
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: _sending
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.send, color: Colors.white, size: 20),
                      onPressed: _sending ? null : _sendReply,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
