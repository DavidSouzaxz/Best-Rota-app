import { useEffect, useState } from "react";
import {
  Linking,
  NativeEventEmitter,
  NativeModules,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Home() {
  const [appAtivo, setAppAtivo] = useState(true);
  const [historico, setHistorico] = useState([]);

  // Variáveis fixas de cálculo
  const precoCombustivel = 6.54;
  const consumoVeiculo = 10;

  const alternarServico = (estado) => {
    setAppAtivo(estado);
    if (NativeModules.UberBridge) {
      NativeModules.UberBridge.alternarStatusServico(estado);
    }
  };

  const limparHistorico = () => {
    setHistorico([]);
  };

  // Função para abrir o app da Uber Driver
  const abrirUberDriver = async () => {
    const packageName = "com.ubercab.driver";

    try {
      // Tenta abrir o app da Uber diretamente pelo scheme
      const url = "uber://";
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        // Se não tiver o app instalado, tenta abrir via link web da Play Store de forma segura
        const webUrl = `https://play.google.com/store/apps/details?id=${packageName}`;
        const webSupported = await Linking.canOpenURL(webUrl);
        if (webSupported) {
          await Linking.openURL(webUrl);
        }
      }
    } catch (error) {
      console.log("Não foi possível abrir o link da Uber:", error);
    }
  };

  useEffect(() => {
    if (!NativeModules.UberBridge) return;
    const eventEmitter = new NativeEventEmitter(NativeModules.UberBridge);

    NativeModules.UberBridge.mostrarBolha();

    const listenerBolha = eventEmitter.addListener("AbrirMenuControle", () => {
      setAppAtivo((prev) => {
        const novoEstado = !prev;
        NativeModules.UberBridge.alternarStatusServico(novoEstado);
        return novoEstado;
      });
    });

    const listenerCorrida = eventEmitter.addListener(
      "CorridaDetectada",
      (dados) => {
        const matchValor = dados.match(/R\$\s*(\d+[,.]\d+)/);
        const matchKm = dados.match(/(\d+[,.]?\d*)\s*km/i);
        const matchMin = dados.match(/(\d+)\s*min/i);

        if (matchValor && matchKm && matchMin) {
          const v = parseFloat(matchValor[1].replace(",", "."));
          const d = parseFloat(matchKm[1].replace(",", "."));
          const t = parseFloat(matchMin[1]);

          const custo = (d / consumoVeiculo) * precoCombustivel;
          const lucro = v - custo;
          const ganhoKm = d > 0 ? lucro / d : 0;
          const ganhoHora = t > 0 ? (lucro / t) * 60 : 0;

          const tempoKmStr = `${t} min - ${d.toFixed(1)} km`;
          const rsKmStr = ganhoKm.toFixed(2);
          const rsHoraStr = ganhoHora.toFixed(0);
          const lucroPctStr =
            v > 0 ? Math.round((lucro / v) * 100) + "%" : "0%";

          let cor = "#ff5252";
          if (ganhoKm >= 2.0) {
            cor = "#00e676";
          } else if (ganhoKm >= 1.4) {
            cor = "#ffeb3b";
          }

          NativeModules.UberBridge.mostrarPopup(
            tempoKmStr,
            rsKmStr,
            rsHoraStr,
            lucroPctStr,
            cor,
          );

          const novaCorrida = {
            id: Date.now().toString(),
            horario: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            valor: v.toFixed(2),
            lucro: lucro.toFixed(2),
            km: d.toFixed(1),
            min: t,
            rsKm: ganhoKm.toFixed(2),
            rsHora: ganhoHora.toFixed(0),
            cor: cor,
          };

          setHistorico((prev) => [novaCorrida, ...prev]);
        }
      },
    );

    return () => {
      listenerBolha.remove();
      listenerCorrida.remove();
      NativeModules.UberBridge.esconderBolha();
    };
  }, []);

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container}>
        {/* TOPO: Toggle de Ligar/Desligar */}
        <View
          style={[
            styles.topToggleCard,
            {
              backgroundColor: appAtivo ? "#003b29" : "#3b1212",
              borderColor: appAtivo ? "#00e676" : "#ff5252",
            },
          ]}
        >
          <View>
            <Text style={styles.toggleTitle}>Captura Automática</Text>
            <Text style={styles.toggleStatus}>
              {appAtivo
                ? "🟢 Sistema Ativo e Monitorando"
                : "🔴 Sistema Pausado"}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              { backgroundColor: appAtivo ? "#00875f" : "#ff5252" },
            ]}
            onPress={() => alternarServico(!appAtivo)}
          >
            <Text style={styles.toggleBtnText}>
              {appAtivo ? "Ativado" : "Desativado"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mensagem de Boas-vindas */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Olá, Motorista! 🚗💨</Text>
          <Text style={styles.welcomeSub}>
            Deixe o app rodando. As chamadas da Uber aparecerão aqui embaixo
            automaticamente assim que tocarem.
          </Text>
        </View>

        {/* Cabeçalho do Histórico */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Corridas Capturadas Hoje</Text>
          {historico.length > 0 && (
            <TouchableOpacity onPress={limparHistorico}>
              <Text style={styles.clearText}>Limpar Histórico</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Lista de Corridas */}
        {historico.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Nenhuma corrida capturada ainda.
            </Text>
            <Text style={styles.emptySubText}>
              Abra a Uber e fique online aguardando chamadas.
            </Text>
          </View>
        ) : (
          historico.map((item) => (
            <View
              key={item.id}
              style={[styles.historyCard, { borderLeftColor: item.cor }]}
            >
              <View style={styles.historyRow}>
                <Text style={styles.historyTime}>🕒 {item.horario}</Text>
                <Text style={styles.historyValue}>R$ {item.valor}</Text>
              </View>
              <View style={styles.historyDetails}>
                <Text style={styles.historyDetailText}>📏 {item.km} km</Text>
                <Text style={styles.historyDetailText}>⏱️ {item.min} min</Text>
                <Text
                  style={[styles.historyDetailHighlight, { color: item.cor }]}
                >
                  💵 R$ {item.rsKm}/km
                </Text>
                <Text style={styles.historyDetailText}>
                  ⚡ R$ {item.rsHora}/h
                </Text>
              </View>
              <View style={styles.lucroRow}>
                <Text style={styles.lucroText}>Lucro Líquido Estimado: </Text>
                <Text style={[styles.lucroVal, { color: item.cor }]}>
                  R$ {item.lucro}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* BOTÃO FLUTUANTE NA INFERIOR DIREITA PARA ABRIR A UBER */}
      <TouchableOpacity
        style={styles.floatingUberBtn}
        onPress={abrirUberDriver}
      >
        <Text style={styles.floatingUberText}> Uber</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#121214",
  },
  container: {
    flex: 1,
    padding: 20,
  },
  topToggleCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 12,
    padding: 15,
    marginTop: 30,
    marginBottom: 15,
    borderWidth: 1,
    elevation: 4,
  },
  toggleTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  toggleStatus: {
    color: "#ccc",
    fontSize: 12,
    marginTop: 2,
  },
  toggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  toggleBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  welcomeCard: {
    backgroundColor: "#202024",
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
  },
  welcomeTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
  },
  welcomeSub: {
    color: "#8d8d99",
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#e1e1e6",
    fontSize: 16,
    fontWeight: "bold",
  },
  clearText: {
    color: "#ff5252",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    backgroundColor: "#202024",
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 40,
  },
  emptyText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  emptySubText: {
    color: "#8d8d99",
    fontSize: 13,
    textAlign: "center",
  },
  historyCard: {
    backgroundColor: "#202024",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 6,
    elevation: 3,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  historyTime: {
    color: "#8d8d99",
    fontSize: 12,
  },
  historyValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  historyDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    backgroundColor: "#121214",
    padding: 8,
    borderRadius: 8,
  },
  historyDetailText: {
    color: "#c4c4cc",
    fontSize: 12,
  },
  historyDetailHighlight: {
    fontSize: 12,
    fontWeight: "bold",
  },
  lucroRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  lucroText: {
    color: "#8d8d99",
    fontSize: 13,
  },
  lucroVal: {
    fontSize: 15,
    fontWeight: "bold",
  },
  // Estilo do botão flutuante da Uber no canto inferior direito
  floatingUberBtn: {
    position: "absolute",
    bottom: 25,
    right: 25,
    backgroundColor: "#000000",
    borderWidth: 2,
    borderColor: "#00e676",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 30,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingUberText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
