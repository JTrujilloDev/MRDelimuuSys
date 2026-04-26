export const connectDB = async (): Promise<void> => {
  try {
    // Aquí iría tu configuración de conexión a BD
    // Por ejemplo, con Prisma, MongoDB, MySQL, etc.
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

export default { connectDB };
