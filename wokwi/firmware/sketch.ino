#include <Servo.h>

const int pinoBotao = 2;
const int pinoServo = 9;
Servo gateServo;

bool gateOpen = false;
unsigned long timeToClose = 0;
const int openDuration = 3000; // 3 segundos aberto

void setup() {
  pinMode(pinoBotao, INPUT_PULLUP);
  gateServo.attach(pinoServo);
  gateServo.write(0); // Garante que começa fechado
  
  Serial.begin(9600);
  Serial.println("Catraca pronta. Envie 'OPEN' ou pressione o botão.");
}

void openGate() {
  if (!gateOpen) {
    Serial.println("Abrindo catraca...");
    gateServo.write(90);
    gateOpen = true;
    timeToClose = millis() + openDuration;
  }
}

void closeGate() {
  if (gateOpen) {
    Serial.println("Fechando catraca...");
    gateServo.write(0);
    gateOpen = false;
  }
}

void loop() {
  // Verifica Serial
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    if (command == "OPEN") {
      openGate();
    }
  }

  // Verifica Botão (LOW quando pressionado devido ao INPUT_PULLUP)
  if (digitalRead(pinoBotao) == LOW) {
    openGate();
    delay(200); // Debounce básico
  }

  // Fecha automaticamente após o tempo
  if (gateOpen && millis() > timeToClose) {
    closeGate();
  }
}
