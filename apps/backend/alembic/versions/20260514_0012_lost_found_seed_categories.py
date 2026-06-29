"""
Seed canonical Lost & Found categories from the technical specification.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260514_0012"
down_revision: str | None = "20260514_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO sc_lost_found.categoria_objeto
            (nombre, descripcion, icono, activa, es_perecible, metadatos_schema)
        VALUES
            ('Electrónicos', 'Dispositivos electrónicos y accesorios tecnológicos', 'Laptop', true, false, '{"subcategorias":["Laptop","Celular","Cargador","Audífonos","Tablet","USB","Power bank"]}'),
            ('Documentos e identificaciones', 'Documentos personales, carnets y credenciales', 'IdCard', true, false, '{"subcategorias":["Carnet PUCP","DNI","Pasaporte","Tarjeta de biblioteca","Licencia"]}'),
            ('Ropa y accesorios personales', 'Prendas de vestir, calzado y accesorios de uso personal', 'Shirt', true, false, '{"subcategorias":["Casaca","Mochila","Bolso","Gorra","Lentes","Paraguas","Reloj"]}'),
            ('Útiles académicos', 'Material de estudio y herramientas académicas', 'BookOpen', true, false, '{"subcategorias":["Cuaderno","Calculadora","Libro","Estuche","Portafolio"]}'),
            ('Llaves y tarjetas de acceso', 'Llaves físicas, controles y tarjetas de proximidad', 'KeyRound', true, false, '{"subcategorias":["Llavero","Llave","Tarjeta de acceso","Control"]}'),
            ('Billeteras y efectos personales', 'Billeteras, monederos, joyería y objetos de valor personal', 'WalletCards', true, false, '{"subcategorias":["Billetera","Monedero","Anillo","Collar","Pulsera","Agenda"]}'),
            ('Alimentos y bebidas', 'Recipientes, loncheras y productos alimenticios', 'CupSoda', true, true, '{"subcategorias":["Lonchera","Botella","Tomatodo","Táper","Termo"]}'),
            ('Deportivos', 'Implementos y equipamiento deportivo', 'Dumbbell', true, false, '{"subcategorias":["Pelota","Raqueta","Zapatillas","Toalla","Guantes"]}'),
            ('Instrumentos musicales', 'Instrumentos y accesorios musicales', 'Music', true, false, '{"subcategorias":["Guitarra","Flauta","Ukulele","Metrónomo","Funda"]}'),
            ('Otros', 'Objetos que no corresponden a ninguna categoría anterior', 'PackageSearch', true, false, '{"subcategorias":[]}')
        ON CONFLICT (nombre) DO UPDATE SET
            descripcion = EXCLUDED.descripcion,
            icono = COALESCE(sc_lost_found.categoria_objeto.icono, EXCLUDED.icono),
            activa = true,
            es_perecible = EXCLUDED.es_perecible,
            metadatos_schema = EXCLUDED.metadatos_schema;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM sc_lost_found.categoria_objeto
        WHERE nombre IN (
            'Documentos e identificaciones',
            'Ropa y accesorios personales',
            'Útiles académicos',
            'Llaves y tarjetas de acceso',
            'Billeteras y efectos personales',
            'Alimentos y bebidas',
            'Deportivos',
            'Instrumentos musicales'
        );
        """
    )
