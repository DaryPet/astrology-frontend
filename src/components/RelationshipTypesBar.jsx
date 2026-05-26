import { useTranslation } from 'react-i18next';

const RelationshipTypesBar = ({ data, dominantType }) => {
  const { t } = useTranslation();

  const typeOrder = [
    { key: 'romantic_partners', color: '#ff6b6b' },
    { key: 'friends', color: '#4fc3f7' },
    { key: 'business_partners', color: '#81c784' },
    { key: 'spiritual_comrades', color: '#ba68c8' }
  ];

  return (
    <div className="relationship-types-container">
      <h3 style={{
        textAlign: 'center',
        marginBottom: '20px',
        color: 'var(--text-primary)',
        fontSize: '18px',
        fontWeight: '600'
      }}>
        {t('relationshipTypes.title')}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {typeOrder.map(({ key, color }) => {
          const item = data?.[key];
          if (!item) return null;

          const isDominant = key === dominantType;
          const percentage = item.percentage || 0;

          return (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  color: isDominant ? color : 'var(--text-secondary)',
                  fontSize: '14px',
                  fontWeight: isDominant ? '600' : '400'
                }}>
                  {item.label || t(`relationshipTypes.${key}`)}
                </span>
                <span style={{
                  color: isDominant ? color : 'var(--text-secondary)',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {percentage}%
                </span>
              </div>

<div style={{
                 width: '100%',
                 height: '12px',
                 backgroundColor: 'var(--bg-secondary)',
                 borderRadius: '6px',
                 overflow: 'hidden',
                 border: '1px solid var(--border)'
               }}>
                 <div style={{
                   width: `${percentage}%`,
                   height: '100%',
                   backgroundColor: color,
                   borderRadius: '6px',
                   transition: 'width 1s ease-out',
                   boxShadow: isDominant ? `0 0 8px ${color}` : 'none'
                 }} />
               </div>

               {item.description && (
                 <div style={{
                   fontSize: '12px',
                   color: 'var(--text-secondary)',
                   marginTop: '4px',
                   lineHeight: '1.4'
                 }}>
                   {item.description}
                 </div>
               )}
             </div>
          );
        })}
      </div>

      {dominantType && data?.[dominantType] && (
        <div style={{
          textAlign: 'center',
          marginTop: '16px',
          padding: '8px 12px',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '6px',
          fontSize: '13px',
          color: 'var(--text-secondary)'
        }}>
          {t('relationshipTypes.dominant')}:{' '}
          <strong style={{ color: typeOrder.find(t => t.key === dominantType)?.color }}>
            {data[dominantType]?.label || t(`relationshipTypes.${dominantType}`)}
          </strong>
        </div>
      )}
    </div>
  );
};

export default RelationshipTypesBar;