/* eslint-disable react/prop-types */
import { Children, isValidElement, useEffect, useState } from 'react';

function conteudo(children) {
  return Children.toArray(children).map(child => isValidElement(child)
    ? conteudo(child.props.children)
    : String(child)).join('|');
}

function acoes(children) {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement(child)) return [];
    if (child.type === 'button' || child.type === 'a') return [child];
    return acoes(child.props.children);
  });
}

// Hide the presentation only: error state may still control retries and data loading.
export default function MensagemTemporaria({ as: Tag = 'p', children, style, ...props }) {
  const identidade = conteudo(children);
  return <Conteudo key={identidade} Tag={Tag} style={style} {...props}>{children}</Conteudo>;
}

function Conteudo({ Tag, children, style, ...props }) {
  const [expirada, setExpirada] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setExpirada(true), 5000);
    return () => clearTimeout(timer);
  }, []);
  // Recovery controls remain usable without retaining the expired message.
  if (expirada) return <>{acoes(children)}</>;
  return <Tag {...props} style={style}>{children}</Tag>;
}
