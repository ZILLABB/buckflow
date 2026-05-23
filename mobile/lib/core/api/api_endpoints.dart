/// All backend API endpoint constants.
/// Base path: /api/v1
class Endpoints {
  Endpoints._();

  // ── Auth ──
  static const String register = '/auth/register';
  static const String login = '/auth/login';
  static const String changePassword = '/auth/change-password';

  // ── Business ──
  static const String businessMe = '/business/me';
  static const String connectWhatsApp = '/business/connect-whatsapp';
  static const String rules = '/business/rules';
  static String deleteRule(String id) => '/business/rules/$id';

  // ── Conversations ──
  static const String conversations = '/conversations';
  static String conversationMessages(String id) =>
      '/conversations/$id/messages';
  static String conversationReply(String id) => '/conversations/$id/reply';
  static String conversationMode(String id) => '/conversations/$id/mode';
  static String conversationArchive(String id) => '/conversations/$id/archive';
  static String conversationAssign(String id) => '/conversations/$id/assign';

  // ── Customers ──
  static const String customers = '/conversations/customers';
  static String updateCustomer(String id) => '/conversations/customers/$id';

  // ── Orders ──
  static const String orders = '/orders';
  static String orderDetail(String id) => '/orders/$id';
  static String orderStatus(String id) => '/orders/$id/status';
  static String orderCancel(String id) => '/orders/$id/cancel';

  // ── Appointments ──
  static const String appointments = '/appointments';
  static String appointmentStatus(String id) => '/appointments/$id/status';
  static const String services = '/appointments/services';

  // ── Analytics ──
  static const String analyticsOverview = '/analytics/overview';
  static const String analyticsUsage = '/analytics/usage';
  static const String analyticsBreakdown = '/analytics/response-breakdown';
  static const String analyticsConversions = '/analytics/conversions';

  // ── Billing ──
  static const String billingPlans = '/billing/plans';
  static const String billingSubscription = '/billing/subscription';
  static const String billingSubscribe = '/billing/subscribe';
  static const String billingVerify = '/billing/verify';
  static const String billingCancel = '/billing/cancel';
  static const String billingHistory = '/billing/history';

  // ── Templates ──
  static const String templates = '/templates';
  static String updateTemplate(String id) => '/templates/$id';
  static String deleteTemplate(String id) => '/templates/$id';
  static const String templateCategories = '/templates/categories';

  // ── Team ──
  static const String teamMembers = '/team/members';
  static String updateMember(String id) => '/team/members/$id';
  static String deleteMember(String id) => '/team/members/$id';
  static const String teamActivity = '/team/activity';
}
