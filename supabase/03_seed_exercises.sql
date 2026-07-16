-- ============================================================
--  SEED DE EJERCICIOS (globales: coach_id = null)
--
--  Trae los 42 ejercicios de fuerza rescatados de tu app anterior
--  MÁS las categorías de cardio, que existían en el menú pero
--  NUNCA tuvieron ejercicios detrás. Ese era el bug del cardio:
--  elegías la categoría y el buscador no mostraba nada.
--
--  Idempotente: se puede volver a correr sin duplicar.
-- ============================================================

create unique index if not exists exercises_global_unique
  on public.exercises (lower(name), lower(category))
  where coach_id is null;

insert into public.exercises (coach_id, name, category) values
  (null, 'Press de banca plano con barra', 'Pectoral en empuje horizontal carga pesada'),
  (null, 'Press de banca plano en maquina Smith', 'Pectoral en empuje horizontal carga pesada'),
  (null, 'Press de banca plano con mancuernas', 'Pectoral en empuje horizontal carga pesada'),
  (null, 'Press de pectoral en maquina acostado', 'Pectoral en empuje horizontal carga pesada'),
  (null, 'Press de banca inclinado con barra', 'Pectoral en empuje vertical'),
  (null, 'Press de banca inclinado en maquina Smith', 'Pectoral en empuje vertical'),
  (null, 'Press de banca inclinado con mancuerna', 'Pectoral en empuje vertical'),
  (null, 'Press de pectoral en maquina inclinado', 'Pectoral en empuje vertical'),
  (null, 'Apertura de pectoral en banco plano con mancuerna', 'Pectoral en abducción horizontal (aislado)'),
  (null, 'Apertura de pectoral en banco plano con poleas', 'Pectoral en abducción horizontal (aislado)'),
  (null, 'Apertura de pectoral en banco inclinado con mancuerna', 'Pectoral en abducción horizontal (aislado)'),
  (null, 'Apertura de pectoral en banco inclinado con poleas', 'Pectoral en abducción horizontal (aislado)'),
  (null, 'Apertura de pectoral en maquina', 'Pectoral en abducción horizontal (aislado)'),
  (null, 'Apertura de pectoral en polea de pie (crossover)', 'Pectoral en abducción horizontal (aislado)'),
  (null, 'Press de hombro con barra de pie', 'Empuje de hombro'),
  (null, 'Press de hombro con mancuerna de pie', 'Empuje de hombro'),
  (null, 'Press de hombro con mancuerna sentado', 'Empuje de hombro'),
  (null, 'Press de hombro con barra sentado', 'Empuje de hombro'),
  (null, 'Press de hombro en maquina smith sentado', 'Empuje de hombro'),
  (null, 'Press de hombro en maquina', 'Empuje de hombro'),
  (null, 'Curl de bíceps en banco predicador con mancuerna', 'Flexion de codo con hombro flexionado'),
  (null, 'Curl de bíceps en banco predicador con barra Z', 'Flexion de codo con hombro flexionado'),
  (null, 'Curl de biceps con mancuerna apoyada en banco inclinado', 'Flexion de codo con hombro flexionado'),
  (null, 'Curl de biceps de araña', 'Flexion de codo con hombro flexionado'),
  (null, 'Curl de bíceps supino en banco inclinado con mancuerna', 'Flexion de codo con extensión de hombro'),
  (null, 'Curl de bíceps supino en banco inclinado con mancuerna a un solo brazo', 'Flexion de codo con extensión de hombro'),
  (null, 'Curl de bíceps neutral en banco inclinado con mancuerna', 'Flexion de codo con extensión de hombro'),
  (null, 'Curl de biceps Bayesian', 'Flexion de codo con extensión de hombro'),
  (null, 'Curl de Bíceps con Mancuerna de pie', 'Flexión de Codo hombro neutro'),
  (null, 'Curl de bíceps con barra Z de pie', 'Flexión de Codo hombro neutro'),
  (null, 'Curl de bíceps con polea baja de pie', 'Flexión de Codo hombro neutro'),
  (null, 'Empuje de tríceps con barra corta  (polea alta)', 'Extensión de triceps vertical (superior a inferior)'),
  (null, 'Empuje de tríceps con barra corta a una sola mano  (polea alta)', 'Extensión de triceps vertical (superior a inferior)'),
  (null, 'Empuje de tríceps con soga de pie (polea alta)', 'Extensión de triceps vertical (superior a inferior)'),
  (null, 'Extensión de tríceps trasnuca a un solo brazo con soga de pie', 'Extension de triceps vertical (inferior-superior)'),
  (null, 'Extensión de tríceps trasnuca con soga de pie', 'Extension de triceps vertical (inferior-superior)'),
  (null, 'Extensión de tríceps trasnuca con mancuernas de pie', 'Extension de triceps vertical (inferior-superior)'),
  (null, 'Extensión de tríceps trasnuca a un solo brazo con mancuerna de pie', 'Extension de triceps vertical (inferior-superior)'),
  (null, 'Flexión de isquiosurales tumbado', 'Flexión de isquiosurales aislado'),
  (null, 'Flexión de isquiosurales tumbado a una sola pierna', 'Flexión de isquiosurales aislado'),
  (null, 'Flexión de isquiosurales sentado', 'Flexión de isquiosurales aislado'),
  (null, 'Flexión de isquiosurales sentado a una sola pierna', 'Flexión de isquiosurales aislado'),
  (null, 'Cardio libre', 'Cardio libre'),
  (null, 'Correr en cinta', 'Correr'),
  (null, 'Correr en exteriores', 'Correr'),
  (null, 'Trote continuo', 'Correr'),
  (null, 'Sprints en cinta', 'Correr'),
  (null, 'Bicicleta estática', 'Ciclismo'),
  (null, 'Bicicleta de spinning', 'Ciclismo'),
  (null, 'Ciclismo en exteriores', 'Ciclismo'),
  (null, 'Bicicleta reclinada', 'Ciclismo'),
  (null, 'Caminata en cinta', 'Caminata'),
  (null, 'Caminata inclinada', 'Caminata'),
  (null, 'Caminata en exteriores', 'Caminata'),
  (null, 'Caminata rápida', 'Caminata'),
  (null, 'Burpees', 'HIIT'),
  (null, 'Mountain climbers', 'HIIT'),
  (null, 'Jumping jacks', 'HIIT'),
  (null, 'Battle ropes', 'HIIT'),
  (null, 'Sprints en intervalos', 'HIIT'),
  (null, 'Salto de cuerda básico', 'Saltar la cuerda'),
  (null, 'Salto de cuerda doble', 'Saltar la cuerda'),
  (null, 'Salto de cuerda alternando pies', 'Saltar la cuerda'),
  (null, 'Estilo libre', 'Natación'),
  (null, 'Pecho', 'Natación'),
  (null, 'Dorso', 'Natación'),
  (null, 'Mariposa', 'Natación'),
  (null, 'Remo en máquina', 'Remo'),
  (null, 'Remo en intervalos', 'Remo'),
  (null, 'Elíptica continua', 'Elíptica'),
  (null, 'Elíptica en intervalos', 'Elíptica')
on conflict do nothing;
