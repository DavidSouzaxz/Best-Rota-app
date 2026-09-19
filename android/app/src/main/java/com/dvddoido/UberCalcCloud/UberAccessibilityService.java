package com.dvddoido.UberCalcCloud;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

public class UberAccessibilityService extends AccessibilityService {
    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event.getPackageName() != null && event.getPackageName().toString().equals("com.ubercab.driver")) {
            AccessibilityNodeInfo rootNode = getRootInActiveWindow();
            if (rootNode != null) {
                StringBuilder sb = new StringBuilder();
                buscarTextosNaTela(rootNode, sb);
                String telaCompleta = sb.toString();
                
                if (telaCompleta.contains("R$") && telaCompleta.contains("km")) {
                    UberBridgeModule.enviarDados(telaCompleta);
                }
            }
        }
    }

    @Override
    public void onInterrupt() {}

    private void buscarTextosNaTela(AccessibilityNodeInfo node, StringBuilder sb) {
        if (node == null) return;
        if (node.getText() != null) {
            sb.append(node.getText().toString()).append(" | ");
        }
        for (int i = 0; i < node.getChildCount(); i++) {
            buscarTextosNaTela(node.getChild(i), sb);
        }
    }
}