import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

import 'package:augmented_reality_plugin_wikitude/architect_widget.dart';
import 'package:augmented_reality_plugin_wikitude/startupConfiguration.dart';
import 'package:flutter/services.dart';

void main() {
  runApp(MyApp());
}
class MyApp extends StatelessWidget {

  @override
  Widget build(BuildContext context) {

    SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Color(0xffffb300)
    ));

    return MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
            primaryColor: Color(0xffffb300),
            primaryColorDark: Color(0xfffb8c00),
            accentColor: Color(0xffffb300)
        ),
        home: ArViewWidget()
    );
  }
}





class ArViewState extends State<ArViewWidget> with WidgetsBindingObserver {
  ArchitectWidget architectWidget;
  String wikitudeLicenseKey = "LICENSE EDU";
  bool loadFailed = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    architectWidget = new ArchitectWidget(
      onArchitectWidgetCreated: onArchitectWidgetCreated,
      licenseKey: wikitudeLicenseKey,
      startupConfiguration: StartupConfiguration(cameraPosition: CameraPosition.BACK, cameraResolution: CameraResolution.AUTO) ,
      features: [ "image_tracking", "geo"],
    );
  }

  Future<void> onArchitectWidgetCreated() async {
    this.architectWidget.load("web/index.html", onLoadSuccess, onLoadFailed);
    if (await Permission.camera.request().isGranted && await Permission.locationWhenInUse.request().isGranted ) {
    this.architectWidget.resume();}
  }

  @override void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.paused:
        if (this.architectWidget != null) {
          this.architectWidget.pause();
        }
        break;
      case AppLifecycleState.resumed:
        if (this.architectWidget != null) {
          this.architectWidget.resume();
        }
        break;

      default:
    }
  }

  Future<void> onLoadSuccess() async {
    loadFailed = false;
  }

  Future<void> onLoadFailed(String error) async {
    loadFailed = true;
    this.architectWidget.showAlert("Failed to load Architect World", error);
  }

  @override
  void dispose() {
    if (this.architectWidget != null) {
      this.architectWidget.pause();
      this.architectWidget.destroy();
    }
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  int _counter = 0;

  void _incrementCounter() {
    setState(() {
      // This call to setState tells the Flutter framework that something has
      // changed in this State, which causes it to rerun the build method below
      // so that the display can reflect the updated values. If we changed
      // _counter without calling setState(), then the build method would not be
      // called again, and so nothing would appear to happen.
      _counter++;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("MZK_AR")),
      body: WillPopScope(
        onWillPop: () async {
          if(defaultTargetPlatform == TargetPlatform.android && !loadFailed) {
            return !(await this.architectWidget.canWebViewGoBack());
          } else {
            return true;
          }
        },
        child: Container(
            decoration: BoxDecoration(color: Colors.black),
            child: architectWidget),
      )
  );
  }
}


class ArViewWidget extends StatefulWidget {
  @override
  ArViewState createState() => ArViewState();
}
