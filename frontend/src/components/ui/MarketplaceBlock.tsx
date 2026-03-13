import { ChangeEvent } from 'react';
import { Input } from './Input';
import { ShopeeIcon, MercadoLivreIcon } from './MarketplaceIcons';

interface MarketplaceBlockProps {
  type: 'shopee' | 'mercadolivre';
  link: string;
  preco: string;
  onLinkChange: (value: string) => void;
  onPrecoChange: (value: string) => void;
}

export function MarketplaceBlock({
  type,
  link,
  preco,
  onLinkChange,
  onPrecoChange,
}: MarketplaceBlockProps) {
  const config = {
    shopee: {
      title: 'Shopee',
      icon: ShopeeIcon,
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      placeholder: 'https://shopee.com.br/...',
    },
    mercadolivre: {
      title: 'Mercado Livre',
      icon: MercadoLivreIcon,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      placeholder: 'https://mercadolivre.com.br/...',
    },
  };

  const c = config[type];
  const Icon = c.icon;

  return (
    <div className={`${c.bgColor} ${c.borderColor} border rounded-lg p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`${c.iconBg} p-2 rounded-lg`}>
          <Icon className={`w-5 h-5 ${c.iconColor}`} />
        </div>
        <h3 className="font-medium text-gray-900">{c.title}</h3>
      </div>

      <div className="space-y-3">
        <Input
          label="Link do Produto"
          value={link}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onLinkChange(e.target.value)}
          placeholder={c.placeholder}
          className="bg-white"
        />
        <Input
          label="Preco (R$)"
          type="number"
          step="0.01"
          min="0"
          value={preco}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onPrecoChange(e.target.value)}
          placeholder="29.90"
          className="bg-white"
        />
      </div>
    </div>
  );
}
