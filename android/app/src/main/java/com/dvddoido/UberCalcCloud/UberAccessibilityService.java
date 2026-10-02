package com.dvddoido.UberCalcCloud;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

public class UberAccessibilityService extends AccessibilityService {
    
    private long ultimaLeitura = 0;
    private boolean corridaNaTela = false;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;

       
        if (event.getEventType() == AccessibilityEvent.TYPE_VIEW_CLICKED) {
            for (CharSequence text : event.getText()) {
                if (text != null && (text.toString().equalsIgnoreCase("Aceitar") || text.toString().equalsIgnoreCase("Selecionar"))) {
                    android.content.Intent intent = new android.content.Intent("com.dvddoido.UberCalcCloud.CORRIDA");
                    intent.putExtra("dados", "ACEITE_DETECTADO");
                    sendBroadcast(intent);
                    return; 
                }
            }
        }
        if (event.getPackageName() == null || !event.getPackageName().toString().equals("com.ubercab.driver")) return;

        long tempoAtual = System.currentTimeMillis();
        if (tempoAtual - ultimaLeitura < 500) return;
        ultimaLeitura = tempoAtual;

        AccessibilityNodeInfo rootNode = getRootInActiveWindow();
        if (rootNode != null) {
            StringBuilder sb = new StringBuilder();
            buscarTextosNaTela(rootNode, sb);
            String telaCompleta = sb.toString();
            
           
            if (telaCompleta.contains("R$") && telaCompleta.contains("km")) {
                if (!corridaNaTela) {
                    UberBridgeModule.enviarDados(telaCompleta);
                    corridaNaTela = true;
                }
            } else {
                
                if (corridaNaTela) {
                    UberBridgeModule.esconderPopupNativo();
                    corridaNaTela = false;
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