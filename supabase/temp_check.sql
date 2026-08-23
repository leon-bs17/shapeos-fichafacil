SELECT u.email, u.tipo, u.id
FROM public.usuarios u
WHERE u.email IN (
  'leonardosousa1725@gmail.com',
  'abraaolima1718@gmail.com',
  'davi.lima7d@gmail.com',
  'personal_1787426424337@shapeosteste.com',
  'aluno_1787426424337@shapeosteste.com'
)
ORDER BY u.tipo, u.email;
