export interface TranslatedError {
  friendly: string;
  systemError: string | null;
}

function translateSystemError(message: string): string | null {
  if (/duplicate key.+unique constraint.*reservations_room_date/i.test(message)) {
    return 'Aynı oda için seçilen tarihte zaten bir rezervasyon bulunuyor. Lütfen farklı bir tarih veya oda seçin.';
  }
  if (/duplicate key/i.test(message) || /violates unique constraint/i.test(message)) {
    return 'Bu kayıt sistemde zaten mevcut. Aynı veriyi tekrar ekleyemezsiniz.';
  }
  if (/row.level security/i.test(message) || /policy/i.test(message)) {
    return 'Bu işlem için yetkiniz bulunmuyor. Lütfen sistem yöneticinizle iletişime geçin.';
  }
  if (/connection/i.test(message) || /timeout/i.test(message) || /network/i.test(message)) {
    return 'Sunucu bağlantısı kurulamadı. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.';
  }
  if (/JWT/i.test(message) || /token/i.test(message) || /auth/i.test(message)) {
    return 'Oturumunuz sona ermiş olabilir. Lütfen tekrar giriş yapın.';
  }
  if (/relation.+does not exist/i.test(message) || /column.+does not exist/i.test(message)) {
    return 'Veritabanı yapısında bir uyumsuzluk tespit edildi. Lütfen sistem yöneticinizle iletişime geçin.';
  }
  if (/foreign key/i.test(message)) {
    return 'İlişkili kayıt bulunamadığı için işlem tamamlanamadı.';
  }
  return null;
}

const SYSTEM_ERROR_PATTERNS = [
  /duplicate key/i,
  /violates/i,
  /constraint/i,
  /policy/i,
  /permission denied/i,
  /connection/i,
  /timeout/i,
  /network/i,
  /JWT/i,
  /token/i,
  /auth\b/i,
  /relation.*does not exist/i,
  /column.*does not exist/i,
  /foreign key/i,
  /syntax error/i,
];

function looksLikeSystemError(message: string): boolean {
  return SYSTEM_ERROR_PATTERNS.some((p) => p.test(message));
}

const PREFIX_REGEX = /^(Silme hatası|Ekleme hatası|Beklenmeyen hata):\s*(.+)$/s;

export function translateError(rawMessage: string): TranslatedError {
  if (!rawMessage) {
    return { friendly: 'Beklenmeyen bir hata oluştu.', systemError: null };
  }

  const prefixMatch = rawMessage.match(PREFIX_REGEX);
  if (prefixMatch) {
    const prefix = prefixMatch[1];
    const innerMessage = prefixMatch[2];
    const innerTranslation = translateSystemError(innerMessage);

    if (innerTranslation) {
      if (innerTranslation.includes('Aynı oda için seçilen tarihte zaten bir rezervasyon bulunuyor')) {
        return {
          friendly: innerTranslation,
          systemError: rawMessage,
        };
      }
      return {
        friendly: `${innerTranslation}`,
        systemError: rawMessage,
      };
    }

    return {
      friendly: `${prefix}: ${innerMessage}`,
      systemError: null,
    };
  }

  if (looksLikeSystemError(rawMessage)) {
    const translation = translateSystemError(rawMessage);
    if (translation) {
      return { friendly: translation, systemError: rawMessage };
    }
    return {
      friendly: 'Veritabanı işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.',
      systemError: rawMessage,
    };
  }

  return { friendly: rawMessage, systemError: null };
}
