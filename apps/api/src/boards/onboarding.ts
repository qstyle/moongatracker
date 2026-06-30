export function buildOnboardingCards(
  boardId: string,
  columnId: string,
  userId: string,
) {
  const titles = [
    'Подключить коллег — добавьте их через настройки проекта',
    'Подключить AI-агентов — создайте API-токен в настройках',
    'Установить MCP — настройте AI-ассистента',
    'Создать первую задачу — добавьте карточку сами',
  ];
  return titles.map((title, order) => ({
    boardId,
    columnId,
    title,
    body: null,
    priority: 'normal',
    authorType: 'user',
    authorId: userId,
    order,
  }));
}
