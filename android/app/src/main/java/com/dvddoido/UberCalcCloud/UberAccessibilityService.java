package com.dvddoido.UberCalcCloud; // Confirme se este é o nome exato do seu pacote

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.util.Log;

public class UberAccessibilityService extends AccessibilityService {
    
    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // Verifica se o evento vem do app do motorista da Uber
        if (event.getPackageName() != null && event.getPackageName().toString().equals("com.ubercab.driver")) {
            AccessibilityNodeInfo rootNode = getRootInActiveWindow();
            
            if (rootNode != null) {
                Log.d("UberCalc", "Tela do Uber ativa. Analisando dados...");
                buscarTextosNaTela(rootNode);
            }
        }
    }

    private void buscarTextosNaTela(AccessibilityNodeInfo node) {
        if (node == null) return;

        if (node.getText() != null) {
            String texto = node.getText().toString();
            Log.d("UberCalcText", texto); 
            
            // Dispara o texto lido para o React Native em tempo real
            UberBridgeModule.enviarDados(texto);
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            buscarTextosNaTela(node.getChild(i));
        }
    }

    @Override
    public void onInterrupt() {
        // Obrigatório sobrescrever, mas não precisamos usar agora
    }
}