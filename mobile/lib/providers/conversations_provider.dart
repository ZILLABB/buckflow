import 'package:flutter/material.dart';
import '../core/api/api_client.dart';
import '../core/api/api_endpoints.dart';
import '../core/constants/app_constants.dart';
import '../models/conversation.dart';

class ConversationsProvider extends ChangeNotifier {
  final ApiClient api;

  List<Conversation> _conversations = [];
  List<Message> _messages = [];
  bool _loading = false;
  bool _loadingMessages = false;
  bool _hasMore = true;
  String? _error;

  ConversationsProvider({required this.api});

  List<Conversation> get conversations => _conversations;
  List<Message> get messages => _messages;
  bool get loading => _loading;
  bool get loadingMessages => _loadingMessages;
  bool get hasMore => _hasMore;
  String? get error => _error;

  Future<void> fetchConversations({bool refresh = false}) async {
    if (refresh) {
      _conversations = [];
      _hasMore = true;
    }
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final offset = refresh ? 0 : _conversations.length;
      final data = await api.get<List<dynamic>>(
        '${Endpoints.conversations}?limit=${AppConstants.pageSize}&offset=$offset',
      );
      final newItems =
          data.map((j) => Conversation.fromJson(j as Map<String, dynamic>)).toList();
      if (refresh) {
        _conversations = newItems;
      } else {
        _conversations.addAll(newItems);
      }
      _hasMore = newItems.length >= AppConstants.pageSize;
    } catch (e) {
      _error = e.toString();
    }

    _loading = false;
    notifyListeners();
  }

  Future<void> loadMore() async {
    if (_loading || !_hasMore) return;
    await fetchConversations();
  }

  Future<void> fetchMessages(String conversationId) async {
    _loadingMessages = true;
    _error = null;
    notifyListeners();

    try {
      final data = await api.get<List<dynamic>>(
        Endpoints.conversationMessages(conversationId),
      );
      _messages =
          data.map((j) => Message.fromJson(j as Map<String, dynamic>)).toList();
    } catch (e) {
      _error = e.toString();
    }

    _loadingMessages = false;
    notifyListeners();
  }

  Future<bool> sendReply(String conversationId, String text) async {
    try {
      await api.post(
        Endpoints.conversationReply(conversationId),
        data: {'message': text},
      );
      await fetchMessages(conversationId);
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> toggleMode(String conversationId, String newMode) async {
    try {
      await api.patch(
        Endpoints.conversationMode(conversationId),
        data: {'mode': newMode},
      );
      // Update local state
      final idx = _conversations.indexWhere((c) => c.id == conversationId);
      if (idx != -1) {
        await fetchConversations(refresh: true);
      }
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> archiveConversation(String conversationId) async {
    try {
      await api.patch(Endpoints.conversationArchive(conversationId));
      _conversations.removeWhere((c) => c.id == conversationId);
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
}
