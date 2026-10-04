import 'package:flutter_test/flutter_test.dart';
import 'package:stroitel/main.dart';

void main() {
  testWidgets('Строитель запускается', (tester) async {
    await tester.pumpWidget(const StroitelApp());
    await tester.pumpAndSettle();
    expect(find.text('СТРОИТЕЛЬ'), findsOneWidget);
  });
}
