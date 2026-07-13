CREATE TABLE IF NOT EXISTS logistics_flights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  speaker_id INTEGER REFERENCES users(id),
  departure_date TEXT,
  departure_time TEXT,
  origin TEXT,
  arrival_date TEXT,
  arrival_time TEXT,
  destination TEXT,
  return_date TEXT,
  return_time TEXT,
  pickup_time TEXT,
  flight_price REAL DEFAULT 0,
  status TEXT DEFAULT 'Programado' CHECK(status IN ('Programado','Confirmado','En viaje','Finalizado','Cancelado')),
  observations TEXT,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_logistics_flights_status ON logistics_flights(status);
CREATE INDEX IF NOT EXISTS idx_logistics_flights_speaker ON logistics_flights(speaker_id);
CREATE INDEX IF NOT EXISTS idx_logistics_flights_dates ON logistics_flights(departure_date, return_date);
