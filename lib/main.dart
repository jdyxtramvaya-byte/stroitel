import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _key = 'stroitel.projects.v2';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const StroitelApp());
}

class StroitelApp extends StatelessWidget {
  const StroitelApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Строитель',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFF59E0B)),
          scaffoldBackgroundColor: const Color(0xFFF5F6F8),
        ),
        home: const ProjectsPage(),
      );
}

class Room {
  Room(this.name, this.length, this.width, this.height);
  String name;
  double length, width, height;
  double get floor => length * width;
  double get walls => 2 * (length + width) * height;
  Map<String, dynamic> toJson() => {
        'name': name, 'length': length, 'width': width, 'height': height
      };
  factory Room.fromJson(Map<String, dynamic> j) => Room(
        j['name'] as String,
        (j['length'] as num).toDouble(),
        (j['width'] as num).toDouble(),
        (j['height'] as num).toDouble(),
      );
}

class Project {
  Project(this.name, {this.address = '', this.client = '', List<Room>? rooms})
      : rooms = rooms ?? [];
  final String name;
  final String address;
  final String client;
  final List<Room> rooms;
  double get floor => rooms.fold(0, (s, r) => s + r.floor);
  double get walls => rooms.fold(0, (s, r) => s + r.walls);
  Map<String, dynamic> toJson() => {
        'name': name,
        'address': address,
        'client': client,
        'rooms': rooms.map((r) => r.toJson()).toList(),
      };
  factory Project.fromJson(Map<String, dynamic> j) => Project(
        j['name'] as String,
        address: (j['address'] as String?) ?? '',
        client: (j['client'] as String?) ?? '',
        rooms: ((j['rooms'] as List?) ?? [])
            .map((x) => Room.fromJson(Map<String, dynamic>.from(x as Map)))
            .toList(),
      );
}

class Store {
  static Future<List<Project>> load() async {
    final p = await SharedPreferences.getInstance();
    final raw = p.getString(_key);
    if (raw == null) return [];
    try {
      return (jsonDecode(raw) as List)
          .map((x) => Project.fromJson(Map<String, dynamic>.from(x as Map)))
          .toList();
    } catch (_) {
      return [];
    }
  }

  static Future<void> save(List<Project> projects) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_key, jsonEncode(projects.map((x) => x.toJson()).toList()));
  }
}

class ProjectsPage extends StatefulWidget {
  const ProjectsPage({super.key});
  @override
  State<ProjectsPage> createState() => _ProjectsPageState();
}

class _ProjectsPageState extends State<ProjectsPage> {
  List<Project> projects = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    Store.load().then((v) {
      if (mounted) setState(() { projects = v; loading = false; });
    });
  }

  Future<void> addProject() async {
    final p = await showDialog<Project>(
      context: context,
      builder: (_) => const NewProjectDialog(),
    );
    if (p == null) return;
    setState(() => projects.insert(0, p));
    await Store.save(projects);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('СТРОИТЕЛЬ', style: TextStyle(fontWeight: FontWeight.w900)),
              Text('Мои объекты', style: TextStyle(fontSize: 13)),
            ],
          ),
          actions: [IconButton(onPressed: addProject, icon: const Icon(Icons.add))],
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: addProject,
          icon: const Icon(Icons.add),
          label: const Text('Объект'),
        ),
        body: loading
            ? const Center(child: CircularProgressIndicator())
            : projects.isEmpty
                ? Center(
                    child: FilledButton.icon(
                      onPressed: addProject,
                      icon: const Icon(Icons.add),
                      label: const Text('Создать первый объект'),
                    ),
                  )
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Card(
                        color: const Color(0xFF171A1F),
                        child: const Padding(
                          padding: EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(Icons.construction, color: Color(0xFFF59E0B), size: 34),
                              SizedBox(height: 14),
                              Text(
                                'Всё по объекту —\nв одном месте.',
                                style: TextStyle(color: Colors.white, fontSize: 25, fontWeight: FontWeight.w800),
                              ),
                              SizedBox(height: 8),
                              Text('Замеры, материалы, смета и дневник работ.',
                                  style: TextStyle(color: Colors.white70)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      ...projects.map(
                        (p) => Card(
                          child: ListTile(
                            onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => ProjectPage(project: p)),
                              );
                              await Store.save(projects);
                              if (mounted) setState(() {});
                            },
                            leading: const CircleAvatar(child: Icon(Icons.home_work_outlined)),
                            title: Text(p.name, style: const TextStyle(fontWeight: FontWeight.w800)),
                            subtitle: Text(
                              p.address.isEmpty
                                  ? p.rooms.length.toString() + ' помещений · ' + p.floor.toStringAsFixed(1) + ' м²'
                                  : p.address + '\n' + p.rooms.length.toString() + ' помещений · ' + p.floor.toStringAsFixed(1) + ' м²',
                            ),
                            isThreeLine: p.address.isNotEmpty,
                            trailing: const Icon(Icons.chevron_right),
                          ),
                        ),
                      ),
                      const SizedBox(height: 80),
                    ],
                  ),
      );
}

class NewProjectDialog extends StatefulWidget {
  const NewProjectDialog({super.key});
  @override
  State<NewProjectDialog> createState() => _NewProjectDialogState();
}

class _NewProjectDialogState extends State<NewProjectDialog> {
  final name = TextEditingController();
  final address = TextEditingController();
  final client = TextEditingController();

  @override
  void dispose() {
    name.dispose(); address.dispose(); client.dispose(); super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
        title: const Text('Новый объект'),
        content: SingleChildScrollView(
          child: Column(
            children: [
              TextField(controller: name, autofocus: true, decoration: const InputDecoration(labelText: 'Название *')),
              const SizedBox(height: 10),
              TextField(controller: address, decoration: const InputDecoration(labelText: 'Адрес')),
              const SizedBox(height: 10),
              TextField(controller: client, decoration: const InputDecoration(labelText: 'Заказчик')),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Отмена')),
          FilledButton(
            onPressed: () {
              if (name.text.trim().isEmpty) return;
              Navigator.pop(
                context,
                Project(name.text.trim(), address: address.text.trim(), client: client.text.trim()),
              );
            },
            child: const Text('Создать'),
          ),
        ],
      );
}

class ProjectPage extends StatefulWidget {
  const ProjectPage({super.key, required this.project});
  final Project project;
  @override
  State<ProjectPage> createState() => _ProjectPageState();
}

class _ProjectPageState extends State<ProjectPage> {
  Future<void> addRoom() async {
    final room = await showDialog<Room>(
      context: context,
      builder: (_) => const RoomDialog(),
    );
    if (room != null) setState(() => widget.project.rooms.add(room));
  }

  void soon(String title) => ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(title + ' — следующий модуль')),
      );

  @override
  Widget build(BuildContext context) {
    final p = widget.project;
    return Scaffold(
      appBar: AppBar(title: Text(p.name)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: addRoom,
        icon: const Icon(Icons.add),
        label: const Text('Замер'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(p.name, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
                  if (p.address.isNotEmpty) Text(p.address),
                  if (p.client.isNotEmpty) Text('Заказчик: ' + p.client),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      _Metric('Пол', p.floor.toStringAsFixed(1) + ' м²'),
                      _Metric('Стены', p.walls.toStringAsFixed(1) + ' м²'),
                      _Metric('Комнаты', p.rooms.length.toString()),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text('Разделы', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          _Module(Icons.straighten, 'Замеры', 'Помещения и размеры', addRoom),
          _Module(Icons.inventory_2_outlined, 'Материалы', 'Автоматический расчёт', () => soon('Материалы')),
          _Module(Icons.payments_outlined, 'Смета', 'Работы и стоимость', () => soon('Смета')),
          _Module(Icons.shopping_cart_outlined, 'Закупки', 'Список покупок', () => soon('Закупки')),
          _Module(Icons.photo_camera_outlined, 'Дневник', 'Фото и события', () => soon('Дневник')),
          _Module(Icons.warning_amber_outlined, 'Проблемы', 'Задачи и замечания', () => soon('Проблемы')),
          if (p.rooms.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Text('Замеры', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            ...p.rooms.map(
              (r) => Card(
                child: ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.square_foot)),
                  title: Text(r.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: Text(
                    r.length.toStringAsFixed(2) + ' × ' +
                        r.width.toStringAsFixed(2) + ' м · высота ' +
                        r.height.toStringAsFixed(2) + ' м',
                  ),
                  trailing: Text(r.floor.toStringAsFixed(1) + ' м²'),
                ),
              ),
            ),
          ],
          const SizedBox(height: 80),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric(this.title, this.value);
  final String title, value;
  @override
  Widget build(BuildContext context) => Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            Text(title, style: const TextStyle(color: Colors.black54)),
          ],
        ),
      );
}

class _Module extends StatelessWidget {
  const _Module(this.icon, this.title, this.subtitle, this.onTap);
  final IconData icon;
  final String title, subtitle;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Card(
        child: ListTile(
          onTap: onTap,
          leading: CircleAvatar(child: Icon(icon)),
          title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
          subtitle: Text(subtitle),
          trailing: const Icon(Icons.chevron_right),
        ),
      );
}

class RoomDialog extends StatefulWidget {
  const RoomDialog({super.key});
  @override
  State<RoomDialog> createState() => _RoomDialogState();
}

class _RoomDialogState extends State<RoomDialog> {
  final name = TextEditingController();
  final l = TextEditingController();
  final w = TextEditingController();
  final h = TextEditingController(text: '2.7');

  double? n(TextEditingController c) => double.tryParse(c.text.replaceAll(',', '.'));

  @override
  void dispose() {
    name.dispose(); l.dispose(); w.dispose(); h.dispose(); super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
        title: const Text('Новый замер'),
        content: SingleChildScrollView(
          child: Column(
            children: [
              TextField(controller: name, autofocus: true, decoration: const InputDecoration(labelText: 'Помещение *')),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(child: TextField(controller: l, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Длина'))),
                  const SizedBox(width: 8),
                  Expanded(child: TextField(controller: w, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Ширина'))),
                ],
              ),
              const SizedBox(height: 10),
              TextField(controller: h, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Высота')),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Отмена')),
          FilledButton(
            onPressed: () {
              final a = n(l), b = n(w), c = n(h);
              if (name.text.trim().isEmpty || a == null || b == null || c == null || a <= 0 || b <= 0 || c <= 0) return;
              Navigator.pop(context, Room(name.text.trim(), a, b, c));
            },
            child: const Text('Сохранить'),
          ),
        ],
      );
}
