USE gastromatch;

UPDATE receitas
SET img = CASE img
    WHEN 'img/pastel.jpg' THEN 'img/pastel.png'
    WHEN 'img/poutine.jpg' THEN 'img/poutine.png'
    WHEN 'img/tacos.jpg' THEN 'img/tacos.png'
    WHEN 'img/carbonara.jpg' THEN 'img/carbonara.png'
    WHEN 'img/camarao.jpg' THEN 'img/camarao.png'
    ELSE img
END
WHERE img IN (
    'img/pastel.jpg',
    'img/poutine.jpg',
    'img/tacos.jpg',
    'img/carbonara.jpg',
    'img/camarao.jpg'
);
