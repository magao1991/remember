module.exports = function(grunt){

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint:{
            options:{
                asi:true,
                laxcomma:true,
                laxbreak:true
            },
            all:['remember.js']
        },
        uglify: {
            options: {
                banner: '/*!\n'
                        + ' * author:jieyou\n'
                        + ' * contacts:baidu hi->youyo1122\n'
                        + ' * see https://github.com/jieyou/remember\n'
                        + ' */\n'
            },
            build: {
                src:'remember.js',
                dest:'remember.min.js'
            }
        }
    });
    
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.registerTask('default', ['jshint','uglify']);
}