import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../providers/conversations_provider.dart';
import '../../models/conversation.dart';

class ConversationsListScreen extends StatefulWidget {
  const ConversationsListScreen({super.key});

  @override
  State<ConversationsListScreen> createState() =>
      _ConversationsListScreenState();
}

class _ConversationsListScreenState extends State<ConversationsListScreen> {
  @override
  void initState() {
    super.initState();
    final provider = context.read<ConversationsProvider>();
    Future.microtask(() => provider.fetchConversations(refresh: true));
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ConversationsProvider>();
    final convos = provider.conversations;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Conversations'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => provider.fetchConversations(refresh: true),
          ),
        ],
      ),
      body: provider.loading && convos.isEmpty
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.emerald))
          : convos.isEmpty
              ? _buildEmpty()
              : RefreshIndicator(
                  color: AppColors.emerald,
                  onRefresh: () => provider.fetchConversations(refresh: true),
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    itemCount: convos.length + (provider.hasMore ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == convos.length) {
                        // Load more trigger
                        provider.loadMore();
                        return const Padding(
                          padding: EdgeInsets.all(16),
                          child: Center(
                            child: CircularProgressIndicator(
                                color: AppColors.emerald),
                          ),
                        );
                      }
                      return _buildTile(convos[index]);
                    },
                  ),
                ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.chat_bubble_outline, size: 64, color: AppColors.slate300),
          const SizedBox(height: 16),
          Text('No conversations yet',
              style: TextStyle(
                  fontSize: 16,
                  color: AppColors.slate500,
                  fontWeight: FontWeight.w500)),
          const SizedBox(height: 8),
          Text(
            'When customers message your\nWhatsApp number, they\'ll appear here.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.slate400, fontSize: 13),
          ),
        ],
      ),
    );
  }

  Widget _buildTile(Conversation c) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: AppColors.emeraldPale,
        child: Text(
          c.customerName.isNotEmpty ? c.customerName[0].toUpperCase() : '?',
          style: const TextStyle(
              color: AppColors.emeraldDark, fontWeight: FontWeight.w700),
        ),
      ),
      title: Row(
        children: [
          Expanded(
            child: Text(c.customerName,
                style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: c.mode == 'ai'
                  ? AppColors.emeraldPale
                  : AppColors.goldLight.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              c.mode == 'ai' ? 'AI' : 'Human',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color:
                    c.mode == 'ai' ? AppColors.emeraldDark : AppColors.goldDark,
              ),
            ),
          ),
        ],
      ),
      subtitle: Text(
        c.lastMessage ?? 'No messages',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(color: AppColors.slate500, fontSize: 13),
      ),
      trailing: Text(
        '${c.messageCount}',
        style: TextStyle(color: AppColors.slate400, fontSize: 12),
      ),
      onTap: () => Navigator.pushNamed(context, '/chat', arguments: c),
    );
  }
}
