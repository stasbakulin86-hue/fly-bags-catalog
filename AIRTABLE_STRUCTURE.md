# Структура Airtable для каталога FLY-BAGS

Создайте базу `FLY-BAGS Каталог` и таблицу `Товары`.

Рекомендуемые поля:

| Поле | Тип | Пример |
|---|---|---|
| id | Single line text | FB-M-BLU |
| title | Single line text | Силиконовый чемодан M |
| category | Single select | Силиконовые |
| size | Single select | M |
| price | Number | 3990 |
| oldPrice | Number | 4490 |
| color | Single select | Синий |
| material | Single select | PP |
| height | Single line text или Number | 65 |
| width | Single line text или Number | 43 |
| depth | Single line text или Number | 26 |
| weight | Single line text или Number | 3.4 |
| features | Long text | Прочный корпус; TSA; Колёса 360° |
| voronezh | Single select | В наличии |
| lipetsk | Single select | В наличии |
| avito | Single select | Да |
| label | Single line text | Хит |
| status | Single select | show |
| image | Single line text | images/fb-m-blue.jpg |
| sort | Number | 1 |
| featured | Checkbox | true |

На первом этапе Airtable можно использовать как удобную таблицу-черновик, а сайт будет работать от `products.json`.
